import { Color, Icon } from "@raycast/api";

enum ContainerColorType {
  DATABASE = Color.Red,
  NETWORK = Color.Blue,
  PLATFORM = Color.Purple,
  DEFAULT = Color.SecondaryText,
}

/**
 * Guessed container information based on a container identifier.
 */
export interface ContainerInfoGuess {
  /**
   * Guessed icon for the container, defaults to {@link Icon.Box}
   */
  icon: string;
  /**
   * Optional: additional label for the container in the list
   */
  label?: string;
  /**
   * Color for the container type
   */
  color: string;
  /**
   * Guessed cluster name for the container
   */
  cluster: string;
  /**
   * Additional keywords guessed for the container
   */
  keywords: string[];
}

/**
 * Container information guesser based on container ids (quite hit & miss)
 * @param containerId The container identifier
 */
export const guessContainerInfo = (containerId: string): ContainerInfoGuess => {
  if (containerId.startsWith("beszel")) {
    return {
      icon: Icon.Eye,
      label: "Beszel",
      color: ContainerColorType.PLATFORM,
      cluster: "Monitoring",
      keywords: ["monitoring"],
    };
  }

  if (containerId.includes("-log")) {
    return {
      icon: Icon.Paragraph,
      label: "Logging",
      color: ContainerColorType.PLATFORM,
      cluster: "Monitoring",
      keywords: ["infrastructure"],
    };
  }

  if (containerId.includes("proxy")) {
    return {
      icon: Icon.Network,
      label: "Proxy",
      color: ContainerColorType.NETWORK,
      cluster: "Networking",
      keywords: ["networking", "infrastructure"],
    };
  }

  // Databases

  if (containerId.includes("postgres")) {
    return {
      icon: Icon.HardDrive,
      label: "Postgres",
      color: ContainerColorType.DATABASE,
      cluster: "Databases",
      keywords: ["database", "sql", "infrastructure"],
    };
  }

  if (containerId.includes("mysql")) {
    return {
      icon: Icon.HardDrive,
      label: "MySQL",
      color: ContainerColorType.DATABASE,
      cluster: "Databases",
      keywords: ["database", "sql", "infrastructure"],
    };
  }

  if (containerId.includes("mssql")) {
    return {
      icon: Icon.HardDrive,
      label: "Microsoft SQL Server",
      color: ContainerColorType.DATABASE,
      cluster: "Databases",
      keywords: ["database", "sql", "infrastructure"],
    };
  }

  if (containerId.includes("redis")) {
    return {
      icon: Icon.HardDrive,
      label: "Redis",
      color: ContainerColorType.DATABASE,
      cluster: "Databases",
      keywords: ["database", "infrastructure"],
    };
  }

  // Platforms

  if (containerId.startsWith("coolify")) {
    return {
      icon: Icon.Cog,
      label: "Coolify",
      color: ContainerColorType.PLATFORM,
      cluster: "Platforms",
      keywords: ["platform"],
    };
  }
  if (containerId.includes("n8n")) {
    return {
      icon: Icon.Cog,
      label: "N8N",
      color: ContainerColorType.PLATFORM,
      cluster: "Platforms",
      keywords: ["automation", "platform"],
    };
  }

  // Browsers

  if (containerId.includes("chrome") || containerId.includes("puppeteer")) {
    return {
      icon: Icon.Window,
      label: "Browser",
      color: ContainerColorType.DEFAULT,
      cluster: "Browsers",
      keywords: ["browser"],
    };
  }

  // CMS Systems

  if (containerId.includes("payload")) {
    return {
      icon: Icon.Pencil,
      label: "Payload CMS",
      color: ContainerColorType.DEFAULT,
      cluster: "Content Management Systems",
      keywords: ["cms", "payload"],
    };
  }

  if (containerId.includes("strapi")) {
    return {
      icon: Icon.Pencil,
      label: "Strapi",
      color: ContainerColorType.DEFAULT,
      cluster: "Content Management Systems",
      keywords: ["cms", "strapi"],
    };
  }

  if (containerId.includes("pocketbase")) {
    return {
      icon: Icon.Pencil,
      label: "Pocketbase",
      color: ContainerColorType.DEFAULT,
      cluster: "Content Management Systems",
      keywords: ["cms", "pocketbase"],
    };
  }

  // Password managers
  if (containerId.includes("vaultwarden") || containerId.includes("bitwarden")) {
    return {
      icon: Icon.Key,
      label: "Bitwarden",
      color: ContainerColorType.DEFAULT,
      cluster: "Password Managers",
      keywords: ["password-manager", "vaultwarden", "bitwarden"],
    };
  }

  // Generic database guess
  if (containerId.includes("-db")) {
    return {
      icon: Icon.HardDrive,
      label: "Database",
      color: ContainerColorType.DATABASE,
      cluster: "Databases",
      keywords: ["database", "infrastructure"],
    };
  }

  return {
    icon: Icon.Box,
    color: ContainerColorType.DEFAULT,
    cluster: "Others",
    keywords: [],
  };
};
