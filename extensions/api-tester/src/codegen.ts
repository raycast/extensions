import { ApiRequest } from "./types";

/**
 * Generate cURL command from API request
 */
export function generateCurl(request: ApiRequest): string {
  let curl = `curl -X ${request.method}`;

  // Add URL
  curl += ` "${request.url}"`;

  // Add headers
  for (const header of request.headers.filter((h) => h.enabled && h.key)) {
    curl += ` \\\n  -H "${header.key}: ${header.value}"`;
  }

  // Add auth headers
  if (request.auth.type === "bearer" && request.auth.bearer) {
    curl += ` \\\n  -H "Authorization: Bearer ${request.auth.bearer.token}"`;
  } else if (request.auth.type === "basic" && request.auth.basic) {
    const credentials = Buffer.from(
      `${request.auth.basic.username}:${request.auth.basic.password}`,
    ).toString("base64");
    curl += ` \\\n  -H "Authorization: Basic ${credentials}"`;
  } else if (
    request.auth.type === "apikey" &&
    request.auth.apikey &&
    request.auth.apikey.addTo === "header"
  ) {
    curl += ` \\\n  -H "${request.auth.apikey.key}: ${request.auth.apikey.value}"`;
  }

  // Add body
  if (request.method !== "GET" && request.body.type !== "none") {
    if (request.body.type === "json" && request.body.json) {
      curl += ` \\\n  -H "Content-Type: application/json"`;
      // Escape single quotes in JSON for shell safety
      const escapedJson = request.body.json.replace(/'/g, "'\\''");
      curl += ` \\\n  -d '${escapedJson}'`;
    } else if (request.body.type === "form-data" && request.body.formData) {
      for (const field of request.body.formData.filter(
        (f) => f.enabled && f.key,
      )) {
        if (field.type === "file" && field.filePath) {
          curl += ` \\\n  -F "${field.key}=@${field.filePath}"`;
        } else {
          curl += ` \\\n  -F "${field.key}=${field.value}"`;
        }
      }
    } else if (
      request.body.type === "x-www-form-urlencoded" &&
      request.body.urlEncoded
    ) {
      curl += ` \\\n  -H "Content-Type: application/x-www-form-urlencoded"`;
      const data = request.body.urlEncoded
        .filter((f) => f.enabled && f.key)
        .map(
          (f) => `${encodeURIComponent(f.key)}=${encodeURIComponent(f.value)}`,
        )
        .join("&");
      curl += ` \\\n  -d '${data}'`;
    } else if (request.body.type === "raw" && request.body.raw) {
      curl += ` \\\n  -d '${request.body.raw}'`;
    }
  }

  return curl;
}

/**
 * Generate JavaScript fetch code from API request
 */
export function generateFetch(request: ApiRequest): string {
  let code = `fetch("${request.url}", {\n`;
  code += `  method: "${request.method}",\n`;

  // Build headers object
  const headers: Record<string, string> = {};

  for (const header of request.headers.filter((h) => h.enabled && h.key)) {
    headers[header.key] = header.value;
  }

  if (request.auth.type === "bearer" && request.auth.bearer) {
    headers["Authorization"] = `Bearer ${request.auth.bearer.token}`;
  } else if (request.auth.type === "basic" && request.auth.basic) {
    const credentials = Buffer.from(
      `${request.auth.basic.username}:${request.auth.basic.password}`,
    ).toString("base64");
    headers["Authorization"] = `Basic ${credentials}`;
  } else if (
    request.auth.type === "apikey" &&
    request.auth.apikey &&
    request.auth.apikey.addTo === "header"
  ) {
    headers[request.auth.apikey.key] = request.auth.apikey.value;
  }

  if (request.body.type === "json") {
    headers["Content-Type"] = "application/json";
  } else if (request.body.type === "x-www-form-urlencoded") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  if (Object.keys(headers).length > 0) {
    code += `  headers: ${JSON.stringify(headers, null, 4).replace(/\n/g, "\n  ")},\n`;
  }

  // Add body
  if (request.method !== "GET" && request.body.type !== "none") {
    if (request.body.type === "json" && request.body.json) {
      // Ensure JSON is properly formatted for code generation
      try {
        const parsedJson = JSON.parse(request.body.json);
        code += `  body: JSON.stringify(${JSON.stringify(parsedJson, null, 4).replace(/\n/g, "\n  ")})\n`;
      } catch {
        // If not valid JSON, use as string
        code += `  body: ${JSON.stringify(request.body.json)}\n`;
      }
    } else if (request.body.type === "form-data" && request.body.formData) {
      code += `  body: (() => {\n`;
      code += `    const formData = new FormData();\n`;
      for (const field of request.body.formData.filter(
        (f) => f.enabled && f.key,
      )) {
        if (field.type === "file" && field.filePath) {
          code += `    // For file upload, you'll need to get the file from an input element\n`;
          code += `    // formData.append("${field.key}", fileInput.files[0]);\n`;
          code += `    formData.append("${field.key}", "FILE: ${field.filePath}");\n`;
        } else {
          code += `    formData.append("${field.key}", "${field.value}");\n`;
        }
      }
      code += `    return formData;\n`;
      code += `  })()\n`;
    } else if (
      request.body.type === "x-www-form-urlencoded" &&
      request.body.urlEncoded
    ) {
      const params = request.body.urlEncoded
        .filter((f) => f.enabled && f.key)
        .map(
          (f) => `${encodeURIComponent(f.key)}=${encodeURIComponent(f.value)}`,
        )
        .join("&");
      code += `  body: "${params}"\n`;
    } else if (request.body.type === "raw" && request.body.raw) {
      code += `  body: ${JSON.stringify(request.body.raw)}\n`;
    }
  }

  code += `})\n`;
  code += `  .then(response => response.json())\n`;
  code += `  .then(data => console.log(data))\n`;
  code += `  .catch(error => console.error('Error:', error));`;

  return code;
}

/**
 * Generate Axios code from API request
 */
export function generateAxios(request: ApiRequest): string {
  let code = `axios({\n`;
  code += `  method: "${request.method.toLowerCase()}",\n`;
  code += `  url: "${request.url}",\n`;

  // Build headers object
  const headers: Record<string, string> = {};

  for (const header of request.headers.filter((h) => h.enabled && h.key)) {
    headers[header.key] = header.value;
  }

  if (request.auth.type === "bearer" && request.auth.bearer) {
    headers["Authorization"] = `Bearer ${request.auth.bearer.token}`;
  } else if (request.auth.type === "basic" && request.auth.basic) {
    const credentials = Buffer.from(
      `${request.auth.basic.username}:${request.auth.basic.password}`,
    ).toString("base64");
    headers["Authorization"] = `Basic ${credentials}`;
  } else if (
    request.auth.type === "apikey" &&
    request.auth.apikey &&
    request.auth.apikey.addTo === "header"
  ) {
    headers[request.auth.apikey.key] = request.auth.apikey.value;
  }

  if (Object.keys(headers).length > 0) {
    code += `  headers: ${JSON.stringify(headers, null, 4).replace(/\n/g, "\n  ")},\n`;
  }

  // Add body
  if (request.method !== "GET" && request.body.type !== "none") {
    if (request.body.type === "json" && request.body.json) {
      // Ensure JSON is properly formatted for code generation
      try {
        const parsedJson = JSON.parse(request.body.json);
        code += `  data: ${JSON.stringify(parsedJson, null, 4).replace(/\n/g, "\n  ")}\n`;
      } catch {
        // If not valid JSON, use as string
        code += `  data: ${JSON.stringify(request.body.json)}\n`;
      }
    } else if (request.body.type === "form-data" && request.body.formData) {
      code += `  data: (() => {\n`;
      code += `    const formData = new FormData();\n`;
      for (const field of request.body.formData.filter(
        (f) => f.enabled && f.key,
      )) {
        if (field.type === "file" && field.filePath) {
          code += `    // For file upload in Node.js, use fs.createReadStream\n`;
          code += `    // formData.append("${field.key}", fs.createReadStream("${field.filePath}"));\n`;
          code += `    formData.append("${field.key}", "FILE: ${field.filePath}");\n`;
        } else {
          code += `    formData.append("${field.key}", "${field.value}");\n`;
        }
      }
      code += `    return formData;\n`;
      code += `  })()\n`;
    } else if (
      request.body.type === "x-www-form-urlencoded" &&
      request.body.urlEncoded
    ) {
      const params = request.body.urlEncoded
        .filter((f) => f.enabled && f.key)
        .map(
          (f) => `${encodeURIComponent(f.key)}=${encodeURIComponent(f.value)}`,
        )
        .join("&");
      code += `  data: "${params}"\n`;
    } else if (request.body.type === "raw" && request.body.raw) {
      code += `  data: ${JSON.stringify(request.body.raw)}\n`;
    }
  }

  code += `})\n`;
  code += `  .then(response => console.log(response.data))\n`;
  code += `  .catch(error => console.error('Error:', error));`;

  return code;
}
