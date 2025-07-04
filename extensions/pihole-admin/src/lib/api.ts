import fetch from "node-fetch";
import { getPreferenceValues, showToast, Toast, LocalStorage } from "@raycast/api";
import { Agent } from "https";

interface Preferences {
  pihole_url: string;
  password: string;
  verify_ssl: boolean;
}

interface AuthResponse {
  session: {
    sid: string;
    valid_until: string;
  };
}

// Interface para Pi-hole v6 (nueva estructura)
interface PiHoleV6SummaryResponse {
  queries: {
    total: number;
    blocked: number;
    percent_blocked: number;
    unique_domains: number;
    forwarded: number;
    cached: number;
    frequency: number;
  };
}

// Interface unificada para la extensión (compatible con ambas versiones)
interface SummaryStats {
  dns: {
    queries_forwarded: number;
    queries_cached: number;
    clients_ever_seen: number;
    unique_domains: number;
    queries_today: number;
    blocked_today: number;
  };
  gravity: {
    domains_being_blocked: number;
  };
}

interface TopItem {
  domain: string;
  count: number;
}

interface TopClients {
  [key: string]: number;
}

// Interface para Pi-hole v6 queries (formato nativo)
interface PiHoleV6Query {
  id: number;
  time: number;
  type: string;
  domain: string;
  cname: string | null;
  status: string | null;
  client: {
    ip: string;
    name: string | null;
  };
  dnssec: string | null;
  reply: {
    type: string | null;
    time: number;
  };
  list_id: number | null;
  upstream: string | null;
  ede: {
    code: number;
    text: string | null;
  };
}

interface PiHoleV6QueryResponse {
  queries: PiHoleV6Query[];
  cursor: number;
  recordsTotal: number;
  recordsFiltered: number;
  draw: number;
  took: number;
}

// Interface legacy para mantener compatibilidad con el componente
interface QueryLogEntry {
  timestamp: string;
  query_type: string;
  domain: string;
  client: string;
  status: string;
  reply_type: string;
  reply_time: number;
  dnssec: string;
}

interface QueryLogResponse {
  queries: QueryLogEntry[];
  cursor: string;
}

class PiHoleAPI {
  private baseUrl: string;
  private password: string;
  private sessionId: string | null = null;
  private httpsAgent: Agent | undefined;
  private authPromise: Promise<void> | null = null;
  private lastAuthTime: number = 0;
  private readonly AUTH_TIMEOUT = 30 * 60 * 1000; // 30 minutos - Sesiones más largas
  private readonly RATE_LIMIT_DELAY = 2000; // 2 segundos entre intentos
  private authRetryCount = 0;
  private readonly MAX_AUTH_RETRIES = 3;

  constructor() {
    const preferences = getPreferenceValues<Preferences>();
    this.baseUrl = preferences.pihole_url.replace(/\/$/, "");
    this.password = preferences.password;

    console.log(`🔧 Configuración Pi-hole:`);
    console.log(`🌐 URL: ${this.baseUrl}`);
    console.log(`🔑 Password configurado: ${this.password ? "✅ Sí" : "❌ No"}`);
    console.log(`🔒 Verificar SSL: ${preferences.verify_ssl ? "✅ Sí" : "❌ No"}`);

    if (!preferences.verify_ssl) {
      this.httpsAgent = new Agent({
        rejectUnauthorized: false,
      });
    }

    // Sesión persistente se cargará de forma lazy cuando sea necesario

    // Limpiar sesión al cerrar la aplicación
    if (typeof process !== "undefined") {
      process.on("exit", () => this.cleanup());
      process.on("SIGINT", () => this.cleanup());
      process.on("SIGTERM", () => this.cleanup());
    }
  }

  private async loadPersistedSession(): Promise<void> {
    try {
      const sessionData = await LocalStorage.getItem("pihole_session");
      if (sessionData && typeof sessionData === "string") {
        const parsed = JSON.parse(sessionData);
        const now = Date.now();

        // Verificar si la sesión sigue siendo válida
        if (parsed.sessionId && parsed.timestamp && now - parsed.timestamp < this.AUTH_TIMEOUT) {
          this.sessionId = parsed.sessionId;
          this.lastAuthTime = parsed.timestamp;
          console.log(
            `💾 Sesión recuperada desde localStorage (${Math.round((now - parsed.timestamp) / 1000)}s de antigüedad)`
          );
        } else {
          console.log(`🗑️ Sesión en localStorage expirada, se eliminará`);
          await LocalStorage.removeItem("pihole_session");
        }
      }
    } catch (error) {
      console.log(`⚠️ No se pudo cargar sesión persistente:`, error);
    }
  }

  private async persistSession(): Promise<void> {
    try {
      if (this.sessionId) {
        const sessionData = {
          sessionId: this.sessionId,
          timestamp: this.lastAuthTime,
        };
        await LocalStorage.setItem("pihole_session", JSON.stringify(sessionData));
        console.log(`💾 Sesión guardada en localStorage`);
      }
    } catch (error) {
      console.log(`⚠️ No se pudo guardar sesión:`, error);
    }
  }

  private cleanup(): void {
    if (this.sessionId) {
      console.log(`🧹 Limpiando sesión al cerrar aplicación...`);
      // Fire and forget - no esperamos
      this.logout().catch(() => {});
    }
  }

  private async makeRequest(endpoint: string, options: any = {}) {
    const url = `${this.baseUrl}/api${endpoint}`;
    const fetchOptions = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    if (this.httpsAgent && url.startsWith("https:")) {
      fetchOptions.agent = this.httpsAgent;
    }

    if (this.sessionId && endpoint !== "/auth") {
      fetchOptions.headers.sid = this.sessionId;
    }

    console.log(`🔍 Haciendo petición a: ${url}`);
    console.log(`📋 Headers:`, { ...fetchOptions.headers, sid: fetchOptions.headers.sid ? "[REDACTED]" : undefined });
    if (fetchOptions.body) {
      const body = typeof fetchOptions.body === "string" ? JSON.parse(fetchOptions.body) : fetchOptions.body;
      const sanitizedBody = { ...body };
      if (sanitizedBody.password) sanitizedBody.password = "[REDACTED]";
      console.log(`📦 Body:`, sanitizedBody);
    }

    try {
      const response = await fetch(url, fetchOptions);
      console.log(`📡 Respuesta: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ Error response body:`, errorText);

        if (response.status === 401) {
          this.sessionId = null;
          throw new Error("Sesión expirada. Reintentando autenticación...");
        }
        throw new Error(`Error HTTP: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const jsonResponse = await response.json();
      console.log(`✅ Respuesta exitosa:`, jsonResponse);
      return jsonResponse;
    } catch (error) {
      console.error(`💥 Error en petición a ${url}:`, error);
      throw error;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async logout(): Promise<void> {
    if (!this.sessionId) return;

    try {
      console.log(`🚪 Cerrando sesión: ${this.sessionId.substring(0, 8)}...`);
      await this.makeRequest("/auth", {
        method: "DELETE",
      });
      console.log(`✅ Sesión cerrada exitosamente`);
    } catch (error) {
      console.log(`⚠️ Error cerrando sesión (puede ser normal):`, error);
    } finally {
      this.sessionId = null;

      // Limpiar localStorage también
      try {
        await LocalStorage.removeItem("pihole_session");
        console.log(`🗑️ Sesión eliminada del localStorage`);
      } catch (error) {
        console.log(`⚠️ No se pudo limpiar localStorage:`, error);
      }
    }
  }

  private async clearAllSessions(): Promise<void> {
    try {
      console.log(`🧹 Intentando limpiar todas las sesiones...`);
      // Algunos endpoints de Pi-hole para limpiar sesiones
      const response = await fetch(`${this.baseUrl}/admin/api.php?logout`, {
        method: "GET",
      });
      console.log(`🧹 Respuesta de limpieza: ${response.status}`);
    } catch (error) {
      console.log(`⚠️ No se pudo limpiar sesiones automáticamente:`, error);
    }
  }

  private async authenticateInternal(): Promise<void> {
    const now = Date.now();

    // Verificar si necesitamos esperar por rate limiting
    const timeSinceLastAuth = now - this.lastAuthTime;
    if (timeSinceLastAuth < this.RATE_LIMIT_DELAY) {
      const waitTime = this.RATE_LIMIT_DELAY - timeSinceLastAuth;
      console.log(`⏱️ Esperando ${waitTime}ms para evitar rate limiting...`);
      await this.delay(waitTime);
    }

    this.lastAuthTime = Date.now();
    console.log(`🔐 Iniciando autenticación (intento ${this.authRetryCount + 1}/${this.MAX_AUTH_RETRIES})...`);

    try {
      const response = (await this.makeRequest("/auth", {
        method: "POST",
        body: JSON.stringify({ password: this.password }),
      })) as AuthResponse;

      this.sessionId = response.session.sid;
      this.authRetryCount = 0; // Reset counter on success
      console.log(`✅ Autenticación exitosa. Session ID: ${this.sessionId?.substring(0, 8)}...`);

      // Guardar sesión en localStorage para reutilización
      await this.persistSession();
    } catch (error) {
      console.error(`❌ Error en autenticación (intento ${this.authRetryCount + 1}):`, error);

      if (error instanceof Error) {
        const errorMessage = error.message;

        // Manejar "API seats exceeded"
        if (errorMessage.includes("api_seats_exceeded")) {
          console.log(`🚫 Límite de sesiones API alcanzado`);

          if (this.authRetryCount < this.MAX_AUTH_RETRIES) {
            this.authRetryCount++;
            console.log(`🧹 Intento ${this.authRetryCount}: Limpiando sesiones y reintentando...`);

            // Limpiar sesión actual si existe
            await this.logout();

            // Intentar limpiar todas las sesiones
            await this.clearAllSessions();

            // Esperar más tiempo antes del reintento (backoff exponencial)
            const backoffDelay = this.RATE_LIMIT_DELAY * Math.pow(2, this.authRetryCount);
            console.log(`⏳ Esperando ${backoffDelay}ms antes del reintento...`);
            await this.delay(backoffDelay);

            // Reintentár recursivamente
            return this.authenticateInternal();
          } else {
            console.log(`💥 Máximo número de reintentos alcanzado`);
            throw new Error(
              "Pi-hole ha alcanzado su límite máximo de sesiones API. Reinicia Pi-hole o espera unos minutos."
            );
          }
        }

        // Manejar rate limiting general
        if (errorMessage.includes("429") || errorMessage.includes("rate_limiting")) {
          console.log(`🚫 Rate limit detectado`);

          if (this.authRetryCount < this.MAX_AUTH_RETRIES) {
            this.authRetryCount++;
            const backoffDelay = this.RATE_LIMIT_DELAY * Math.pow(2, this.authRetryCount);
            console.log(`⏳ Esperando ${backoffDelay}ms por rate limiting...`);
            await this.delay(backoffDelay);

            return this.authenticateInternal();
          } else {
            throw new Error(
              "Rate limiting activo. Pi-hole está limitando los intentos de login. Espera unos minutos e inténtalo de nuevo."
            );
          }
        }
      }

      // Para otros errores, mostrar toast y relanzar
      await showToast({
        style: Toast.Style.Failure,
        title: "Error de Autenticación",
        message: error instanceof Error ? error.message : "Error desconocido",
      });
      throw error;
    }
  }

  async authenticate(): Promise<void> {
    // Si ya hay una autenticación en progreso, esperar a que termine
    if (this.authPromise) {
      console.log(`🔄 Esperando autenticación en progreso...`);
      return this.authPromise;
    }

    // Si ya tenemos una sesión válida reciente, no autenticar de nuevo
    const now = Date.now();
    if (this.sessionId && now - this.lastAuthTime < this.AUTH_TIMEOUT) {
      console.log(`✅ Usando sesión existente (${Math.round((now - this.lastAuthTime) / 1000)}s de antigüedad)`);
      return;
    }

    console.log(`🚀 Iniciando nueva autenticación...`);

    // Resetear contador de reintentos para nueva sesión
    this.authRetryCount = 0;

    // Añadir pequeño delay aleatorio para evitar colisiones entre comandos
    const antiCollisionDelay = Math.random() * 500; // 0-500ms
    await this.delay(antiCollisionDelay);

    // Crear y almacenar la promesa de autenticación
    this.authPromise = this.authenticateInternal().finally(() => {
      // Limpiar la promesa cuando termine (exitosa o fallida)
      this.authPromise = null;
    });

    return this.authPromise;
  }

  private async ensureAuthenticated() {
    // Cargar sesión persistente si no se ha intentado ya
    if (!this.sessionId && this.lastAuthTime === 0) {
      await this.loadPersistedSession();
    }

    await this.authenticate();
  }

  async getSummary(): Promise<SummaryStats> {
    try {
      await this.ensureAuthenticated();
      const v6Response = (await this.makeRequest("/stats/summary")) as PiHoleV6SummaryResponse;

      console.log("🔍 Respuesta raw de Pi-hole v6:", JSON.stringify(v6Response, null, 2));

      // Verificar que la respuesta tenga la estructura esperada
      if (!v6Response || !v6Response.queries) {
        console.error("❌ Respuesta de Pi-hole v6 no tiene estructura esperada:", v6Response);
        throw new Error("Respuesta inválida de Pi-hole v6");
      }

      // Mapear datos de Pi-hole v6 al formato esperado por la extensión
      const mappedData = {
        dns: {
          queries_today: v6Response.queries.total || 0,
          blocked_today: v6Response.queries.blocked || 0,
          queries_forwarded: v6Response.queries.forwarded || 0,
          queries_cached: v6Response.queries.cached || 0,
          unique_domains: v6Response.queries.unique_domains || 0,
          clients_ever_seen: 0, // Este campo no existe en v6, se calculará de otra forma
        },
        gravity: {
          domains_being_blocked: 0, // Este campo se obtendrá de otro endpoint si es necesario
        },
      };

      console.log("✅ Datos mapeados para la extensión:", JSON.stringify(mappedData, null, 2));
      return mappedData;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("Sesión expirada")) {
          await this.authenticate();
          const v6Response = (await this.makeRequest("/stats/summary")) as PiHoleV6SummaryResponse;

          if (!v6Response || !v6Response.queries) {
            throw new Error("Respuesta inválida de Pi-hole v6 después de reautenticación");
          }

          return {
            dns: {
              queries_today: v6Response.queries.total || 0,
              blocked_today: v6Response.queries.blocked || 0,
              queries_forwarded: v6Response.queries.forwarded || 0,
              queries_cached: v6Response.queries.cached || 0,
              unique_domains: v6Response.queries.unique_domains || 0,
              clients_ever_seen: 0,
            },
            gravity: {
              domains_being_blocked: 0,
            },
          };
        }

        // FALLBACK: Si falla por límites de API, intentar método legacy
        if (error.message.includes("api_seats_exceeded") || error.message.includes("429")) {
          console.log(`🔄 Fallback: Intentando API legacy para summary...`);
          return await this.getSummaryLegacy();
        }
      }
      throw error;
    }
  }

  private async getSummaryLegacy(): Promise<SummaryStats> {
    const url = `${this.baseUrl}/admin/api.php?summaryRaw&auth=${this.password}`;
    console.log(`🔍 Petición Legacy Summary: ${url}`);

    const fetchOptions: any = {
      method: "GET",
      headers: { "User-Agent": "Raycast Pi-hole Extension" },
    };

    if (this.httpsAgent && url.startsWith("https:")) {
      fetchOptions.agent = this.httpsAgent;
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`Legacy API Error: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();

    // Verificar si es error de Pi-hole v6
    if (text.includes('"error"') && text.includes("API is hosted at")) {
      throw new Error(
        "❌ Pi-hole v6 no soporta API legacy. SOLUCIÓN: Configura 'max_sessions = 10' en /etc/pihole/pihole.toml y reinicia Pi-hole"
      );
    }

    const legacy = JSON.parse(text);

    // Convertir formato legacy al moderno
    return {
      dns: {
        queries_today: legacy.dns_queries_today || 0,
        blocked_today: legacy.ads_blocked_today || 0,
        queries_forwarded: legacy.queries_forwarded || 0,
        queries_cached: legacy.queries_cached || 0,
        clients_ever_seen: legacy.clients_ever_seen || 0,
        unique_domains: legacy.unique_domains || 0,
      },
      gravity: {
        domains_being_blocked: legacy.domains_being_blocked || 0,
      },
    };
  }

  async getStatus(): Promise<{ enabled: boolean }> {
    try {
      await this.ensureAuthenticated();
      const response = (await this.makeRequest("/dns/blocking")) as { blocking: boolean | string };
      // Pi-hole v6 puede devolver string "enabled" o boolean true
      const isEnabled = response.blocking === true || response.blocking === "enabled";
      return { enabled: isEnabled };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("Sesión expirada")) {
          await this.authenticate();
          const response = (await this.makeRequest("/dns/blocking")) as { blocking: boolean | string };
          const isEnabled = response.blocking === true || response.blocking === "enabled";
          return { enabled: isEnabled };
        }

        // FALLBACK: Si falla por límites de API, intentar método legacy
        if (error.message.includes("api_seats_exceeded") || error.message.includes("429")) {
          console.log(`🔄 Fallback: Intentando API legacy para status...`);
          return await this.getStatusLegacy();
        }
      }
      throw error;
    }
  }

  private async getStatusLegacy(): Promise<{ enabled: boolean }> {
    const url = `${this.baseUrl}/admin/api.php?status&auth=${this.password}`;
    console.log(`🔍 Petición Legacy Status: ${url}`);

    const fetchOptions: any = {
      method: "GET",
      headers: { "User-Agent": "Raycast Pi-hole Extension" },
    };

    if (this.httpsAgent && url.startsWith("https:")) {
      fetchOptions.agent = this.httpsAgent;
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`Legacy API Error: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();

    if (text.includes('"error"') && text.includes("API is hosted at")) {
      throw new Error(
        "❌ Pi-hole v6 no soporta API legacy. SOLUCIÓN: Configura 'max_sessions = 10' en /etc/pihole/pihole.toml y reinicia Pi-hole"
      );
    }

    const legacy = JSON.parse(text);
    return { enabled: legacy.status === "enabled" };
  }

  async enable(): Promise<void> {
    await this.ensureAuthenticated();
    try {
      await this.makeRequest("/dns/blocking", {
        method: "PATCH",
        body: JSON.stringify({ blocking: true }),
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Sesión expirada")) {
        await this.authenticate();
        await this.makeRequest("/dns/blocking", {
          method: "PATCH",
          body: JSON.stringify({ blocking: true }),
        });
      } else {
        throw error;
      }
    }
  }

  async disable(duration?: number): Promise<void> {
    await this.ensureAuthenticated();
    const body: any = { blocking: false };
    if (duration) {
      body.timer = duration;
    }

    try {
      await this.makeRequest("/dns/blocking", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Sesión expirada")) {
        await this.authenticate();
        await this.makeRequest("/dns/blocking", {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        throw error;
      }
    }
  }

  async getTopDomains(count = 10): Promise<{ allowed: TopItem[]; blocked: TopItem[] }> {
    await this.ensureAuthenticated();

    // Pi-hole v6 requiere parámetros 'from' y 'until' - usar últimas 24 horas
    const until = Math.floor(Date.now() / 1000); // timestamp actual en segundos
    const from = until - 24 * 60 * 60; // 24 horas antes

    try {
      const [allowedResponse, blockedResponse] = await Promise.all([
        this.makeRequest(`/stats/database/top_domains?from=${from}&until=${until}&count=${count}&blocked=false`),
        this.makeRequest(`/stats/database/top_domains?from=${from}&until=${until}&count=${count}&blocked=true`),
      ]);

      return {
        allowed: (allowedResponse as any).domains || [],
        blocked: (blockedResponse as any).domains || [],
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("Sesión expirada")) {
        await this.authenticate();
        const [allowedResponse, blockedResponse] = await Promise.all([
          this.makeRequest(`/stats/database/top_domains?from=${from}&until=${until}&count=${count}&blocked=false`),
          this.makeRequest(`/stats/database/top_domains?from=${from}&until=${until}&count=${count}&blocked=true`),
        ]);
        return {
          allowed: (allowedResponse as any).domains || [],
          blocked: (blockedResponse as any).domains || [],
        };
      }
      throw error;
    }
  }

  async getTopClients(count = 10): Promise<TopClients> {
    await this.ensureAuthenticated();

    // Pi-hole v6 requiere parámetros 'from' y 'until' - usar últimas 24 horas
    const until = Math.floor(Date.now() / 1000); // timestamp actual en segundos
    const from = until - 24 * 60 * 60; // 24 horas antes

    try {
      const response = await this.makeRequest(`/stats/database/top_clients?from=${from}&until=${until}&count=${count}`);
      console.log(`🔍 Respuesta completa de top_clients:`, JSON.stringify(response, null, 2));
      return (response as any).clients || {};
    } catch (error) {
      if (error instanceof Error && error.message.includes("Sesión expirada")) {
        await this.authenticate();
        const response = await this.makeRequest(
          `/stats/database/top_clients?from=${from}&until=${until}&count=${count}`
        );
        return (response as any).clients || {};
      }
      throw error;
    }
  }

  async getQueryLog(cursor?: string, count = 100): Promise<QueryLogResponse> {
    await this.ensureAuthenticated();
    const params = new URLSearchParams();
    params.append("length", count.toString()); // Pi-hole v6 usa 'length' en lugar de 'count'
    if (cursor) {
      params.append("cursor", cursor);
    }

    try {
      const v6Response = (await this.makeRequest(`/queries?${params.toString()}`)) as PiHoleV6QueryResponse;

      // Mapear datos de Pi-hole v6 al formato legacy para compatibilidad
      const mappedQueries: QueryLogEntry[] = v6Response.queries.map((query) => ({
        timestamp: new Date(query.time * 1000).toISOString(), // Convertir timestamp Unix a ISO string
        query_type: query.type,
        domain: query.domain,
        client: query.client.name || query.client.ip,
        status: query.status || "UNKNOWN",
        reply_type: query.reply.type || "UNKNOWN",
        reply_time: query.reply.time,
        dnssec: query.dnssec || "UNKNOWN",
      }));

      return {
        queries: mappedQueries,
        cursor: v6Response.cursor.toString(),
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("Sesión expirada")) {
        await this.authenticate();
        const v6Response = (await this.makeRequest(`/queries?${params.toString()}`)) as PiHoleV6QueryResponse;

        const mappedQueries: QueryLogEntry[] = v6Response.queries.map((query) => ({
          timestamp: new Date(query.time * 1000).toISOString(),
          query_type: query.type,
          domain: query.domain,
          client: query.client.name || query.client.ip,
          status: query.status || "UNKNOWN",
          reply_type: query.reply.type || "UNKNOWN",
          reply_time: query.reply.time,
          dnssec: query.dnssec || "UNKNOWN",
        }));

        return {
          queries: mappedQueries,
          cursor: v6Response.cursor.toString(),
        };
      }
      throw error;
    }
  }

  async addToWhitelist(domain: string): Promise<void> {
    await this.ensureAuthenticated();
    try {
      await this.makeRequest("/domains/allowlist/exact", {
        method: "POST",
        body: JSON.stringify({ domain: domain }), // Pi-hole v6 usa 'domain' singular
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Sesión expirada")) {
        await this.authenticate();
        await this.makeRequest("/domains/allowlist/exact", {
          method: "POST",
          body: JSON.stringify({ domain: domain }),
        });
      } else {
        throw error;
      }
    }
  }

  async addToBlacklist(domain: string): Promise<void> {
    await this.ensureAuthenticated();
    try {
      await this.makeRequest("/domains/denylist/exact", {
        method: "POST",
        body: JSON.stringify({ domain: domain }), // Pi-hole v6 usa 'domain' singular
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Sesión expirada")) {
        await this.authenticate();
        await this.makeRequest("/domains/denylist/exact", {
          method: "POST",
          body: JSON.stringify({ domain: domain }),
        });
      } else {
        throw error;
      }
    }
  }

  async flushLogs(): Promise<void> {
    await this.ensureAuthenticated();
    try {
      await this.makeRequest("/action/flush/logs", {
        method: "POST", // Pi-hole v6 usa POST para acciones
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Sesión expirada")) {
        await this.authenticate();
        await this.makeRequest("/action/flush/logs", {
          method: "POST",
        });
      } else {
        throw error;
      }
    }
  }
}

// Instancia singleton global compartida entre TODOS los comandos de Raycast
let apiInstance: PiHoleAPI | null = null;
const GLOBAL_INSTANCE_KEY = "_pihole_api_instance";

export const getPiHoleAPI = (): PiHoleAPI => {
  // Intentar obtener instancia del contexto global de Node.js
  if (typeof global !== "undefined") {
    if ((global as any)[GLOBAL_INSTANCE_KEY]) {
      console.log(`♻️ Reutilizando instancia global existente de PiHoleAPI`);
      return (global as any)[GLOBAL_INSTANCE_KEY];
    }
  }

  // Si no existe, crear nueva instancia
  if (!apiInstance) {
    console.log(`🏗️ Creando nueva instancia GLOBAL de PiHoleAPI`);
    apiInstance = new PiHoleAPI();

    // Guardar en contexto global
    if (typeof global !== "undefined") {
      (global as any)[GLOBAL_INSTANCE_KEY] = apiInstance;
    }
  }

  return apiInstance;
};

// Para compatibilidad con código existente
export const piHoleAPI = getPiHoleAPI();
