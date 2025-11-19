import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  language?: string;
}

type Translations = {
  [key: string]: {
    en: string;
    pt: string;
  };
};

const translations: Translations = {
  // Xcodes CLI
  "xcodes.notFound": {
    en: "xcodes not found",
    pt: "xcodes não encontrado",
  },
  "xcodes.installMessage": {
    en: "Install with: brew install xcodesorg/made/xcodes",
    pt: "Instale com: brew install xcodesorg/made/xcodes",
  },

  // Common
  error: {
    en: "Error",
    pt: "Erro",
  },
  success: {
    en: "Success",
    pt: "Sucesso",
  },
  loading: {
    en: "Loading...",
    pt: "Carregando...",
  },

  // Update
  "update.updating": {
    en: "Updating Xcode list...",
    pt: "Atualizando lista do Xcode...",
  },
  "update.success": {
    en: "Xcode list updated successfully",
    pt: "Lista do Xcode atualizada com sucesso",
  },

  // Download Form
  "download.selectVersion": {
    en: "Select a version",
    pt: "Selecione uma versão",
  },
  "download.enterVersion": {
    en: "Enter the exact version number you want to download",
    pt: "Digite o número exato da versão que deseja baixar",
  },
  "download.description": {
    en: "Download a specific version of Xcode without installing it. The downloaded file will be saved but not installed.",
    pt: "Baixa uma versão específica do Xcode sem instalá-la. O arquivo baixado será salvo mas não instalado.",
  },
  "download.note": {
    en: "This will download the Xcode .xip file to your Downloads folder. You can install it later using the 'Install Xcode' command or manually.",
    pt: "Isso baixará o arquivo .xip do Xcode para sua pasta Downloads. Você pode instalá-lo depois usando o comando 'Instalar Xcode' ou manualmente.",
  },
  "download.enterVersionPrompt": {
    en: "Please enter a version number",
    pt: "Por favor, digite um número de versão",
  },

  // Install Form
  "install.selectVersion": {
    en: "Select a version",
    pt: "Selecione uma versão",
  },
  "install.enterVersion": {
    en: "Enter the exact version number you want to install",
    pt: "Digite o número exato da versão que deseja instalar",
  },
  "install.description": {
    en: "Download and install a specific version of Xcode. This will download the .xip file and automatically install it.",
    pt: "Baixa e instala uma versão específica do Xcode. Isso baixará o arquivo .xip e o instalará automaticamente.",
  },
  "install.warning": {
    en: "⚠️ This process can take a long time (30+ minutes) depending on your internet speed and system performance. The download is typically 10-15 GB.",
    pt: "⚠️ Este processo pode demorar muito (30+ minutos) dependendo da sua velocidade de internet e desempenho do sistema. O download normalmente é de 10-15 GB.",
  },
  "install.enterVersionPrompt": {
    en: "Please enter a version number",
    pt: "Por favor, digite um número de versão",
  },

  // Download actions
  "download.title": {
    en: "Download Xcode",
    pt: "Baixar Xcode",
  },
  "download.downloading": {
    en: "Downloading Xcode {{version}}...",
    pt: "Baixando Xcode {{version}}...",
  },
  "download.success": {
    en: "Xcode {{version}} downloaded successfully",
    pt: "Xcode {{version}} baixado com sucesso",
  },

  // Install actions
  "install.title": {
    en: "Install Xcode",
    pt: "Instalar Xcode",
  },
  "install.installing": {
    en: "Installing Xcode {{version}}...",
    pt: "Instalando Xcode {{version}}...",
  },
  "install.success": {
    en: "Xcode {{version}} installed successfully",
    pt: "Xcode {{version}} instalado com sucesso",
  },

  // Uninstall actions
  "uninstall.title": {
    en: "Uninstall Xcode",
    pt: "Desinstalar Xcode",
  },
  "uninstall.confirm": {
    en: "Uninstall Xcode {{version}}?",
    pt: "Desinstalar Xcode {{version}}?",
  },
  "uninstall.uninstalling": {
    en: "Uninstalling Xcode {{version}}...",
    pt: "Desinstalando Xcode {{version}}...",
  },
  "uninstall.success": {
    en: "Xcode {{version}} uninstalled successfully",
    pt: "Xcode {{version}} desinstalado com sucesso",
  },

  // Select actions
  "select.switching": {
    en: "Switching to Xcode {{version}}...",
    pt: "Alterando para Xcode {{version}}...",
  },
  "select.success": {
    en: "Xcode {{version}} is now active",
    pt: "Xcode {{version}} está ativo agora",
  },

  // List actions
  "list.installXcode": {
    en: "Install Xcode {{version}}",
    pt: "Instalar Xcode {{version}}",
  },
  "list.downloadXcode": {
    en: "Download Xcode {{version}}",
    pt: "Baixar Xcode {{version}}",
  },
  "list.installed": {
    en: "Installed",
    pt: "Instalado",
  },

  // Authentication
  "auth.password": {
    en: "Password",
    pt: "Senha",
  },
  "auth.enterPassword": {
    en: "Enter your macOS password",
    pt: "Digite sua senha do macOS",
  },
  "auth.passwordRequired": {
    en: "Password Required",
    pt: "Senha Necessária",
  },
  "auth.invalidPassword": {
    en: "Invalid Password",
    pt: "Senha Inválida",
  },
  "auth.tryAgain": {
    en: "Please try again",
    pt: "Por favor, tente novamente",
  },
  "auth.validating": {
    en: "Validating password...",
    pt: "Validando senha...",
  },
  "auth.passwordSaved": {
    en: "Password saved successfully",
    pt: "Senha salva com sucesso",
  },
  "auth.savePassword": {
    en: "Save Password",
    pt: "Salvar Senha",
  },
  "auth.configurePassword": {
    en: "Configure Password",
    pt: "Configurar Senha",
  },
  "auth.clearPassword": {
    en: "Clear Saved Password",
    pt: "Limpar Senha Salva",
  },
  "auth.passwordCleared": {
    en: "Password cleared",
    pt: "Senha removida",
  },
  "auth.passwordDescription": {
    en: "To switch Xcode versions, we need your macOS password. It will be stored securely in Raycast's local storage.",
    pt: "Para trocar versões do Xcode, precisamos da sua senha do macOS. Ela será armazenada de forma segura no armazenamento local do Raycast.",
  },
  "auth.passwordNote": {
    en: "⚠️ Your password is stored locally and used only for executing sudo commands to switch Xcode versions.",
    pt: "⚠️ Sua senha é armazenada localmente e usada apenas para executar comandos sudo para trocar versões do Xcode.",
  },

  // Select / Toggle
  "select.noVersions": {
    en: "No Xcode versions found",
    pt: "Nenhuma versão do Xcode encontrada",
  },
  "select.selectVersion": {
    en: "Select This Version",
    pt: "Selecionar Esta Versão",
  },
  "select.active": {
    en: "Active",
    pt: "Ativa",
  },

  // Installed
  "installed.openInFinder": {
    en: "Open in Finder",
    pt: "Abrir no Finder",
  },

  // Runtimes
  "runtimes.install": {
    en: "Install Runtime",
    pt: "Instalar Runtime",
  },

  // Common
  reload: {
    en: "Reload",
    pt: "Recarregar",
  },
  "xcodes.viewDocs": {
    en: "View xcodes Documentation",
    pt: "Ver Documentação do xcodes",
  },
  "xcodes.installBrew": {
    en: "Install Homebrew",
    pt: "Instalar Homebrew",
  },
};

// Detecta o idioma baseado na preferência do usuário ou do sistema
function getLocale(): "en" | "pt" {
  // Tenta obter as preferências do usuário
  try {
    const preferences = getPreferenceValues<Preferences>();

    console.log("[i18n] User language preference:", preferences.language);

    // Se o usuário escolheu um idioma específico, usa ele
    if (preferences.language && preferences.language !== "auto") {
      console.log("[i18n] Using user-selected language:", preferences.language);
      return preferences.language as "en" | "pt";
    }
  } catch {
    console.log("[i18n] Could not load preferences, using system default");
  }

  // Tenta detectar o idioma do sistema
  const locale =
    process.env.LANG ||
    process.env.LC_ALL ||
    process.env.LANGUAGE ||
    process.env.LC_MESSAGES ||
    "";

  console.log("[i18n] System locale:", locale);

  // Se contém "pt" ou "pt_" ou "pt-", usa português
  const isPortuguese =
    locale.toLowerCase().includes("pt_") ||
    locale.toLowerCase().includes("pt-") ||
    locale.toLowerCase().startsWith("pt");

  const detectedLang = isPortuguese ? "pt" : "en";
  console.log("[i18n] Detected language:", detectedLang);

  return detectedLang;
}

// Função para substituir variáveis no formato {{key}}
function interpolate(text: string, vars?: Record<string, string>): string {
  if (!vars) return text;

  return Object.keys(vars).reduce((result, key) => {
    return result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), vars[key]);
  }, text);
}

export function t(key: string, vars?: Record<string, string>): string {
  const locale = getLocale();
  const translation = translations[key];

  if (!translation) {
    console.warn(`Translation not found for key: ${key}`);
    return key;
  }

  const text = translation[locale] || translation.en || key;
  return interpolate(text, vars);
}
