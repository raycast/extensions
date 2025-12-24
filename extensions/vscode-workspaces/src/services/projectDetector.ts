import { join } from "path";
import { pathExists } from "../utils/fs";

export type ProjectType = {
  id: string;
  icon: string; // Devicon CDN path
  test: (workspacePath: string) => Promise<boolean>;
};

const deviconBase = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons";

function iconPath(folder: string, file: string) {
  return `${deviconBase}/${folder}/${file}`;
}

async function fileExists(dir: string, file: string) {
  return pathExists(join(dir, file));
}

async function hasPackageDep(dir: string, dep: string) {
  try {
    const pkgPath = join(dir, "package.json");
    const json = JSON.parse(await (await import("fs/promises")).readFile(pkgPath, "utf8"));
    return json.dependencies?.[dep] !== undefined || json.devDependencies?.[dep] !== undefined;
  } catch {
    return false;
  }
}

export const projectTypes: ProjectType[] = [
  // JavaScript/TypeScript Frameworks
  {
    id: "raycast",
    icon: "icons/raycast.svg", // local asset
    async test(dir) {
      return (await fileExists(dir, "raycast-env.d.ts")) || (await hasPackageDep(dir, "@raycast/api"));
    },
  },
  {
    id: "nextjs",
    icon: iconPath("nextjs", "nextjs-original.svg"),
    async test(dir) {
      return (await fileExists(dir, "next.config.js")) || (await hasPackageDep(dir, "next"));
    },
  },
  {
    id: "vue",
    icon: iconPath("vuejs", "vuejs-original.svg"),
    async test(dir) {
      return (await hasPackageDep(dir, "vue")) || (await hasPackageDep(dir, "nuxt"));
    },
  },
  {
    id: "angular",
    icon: iconPath("angularjs", "angularjs-original.svg"),
    async test(dir) {
      return (await hasPackageDep(dir, "@angular/core")) || (await fileExists(dir, "angular.json"));
    },
  },
  {
    id: "svelte",
    icon: iconPath("svelte", "svelte-original.svg"),
    async test(dir) {
      return (await hasPackageDep(dir, "svelte")) || (await fileExists(dir, "svelte.config.js"));
    },
  },
  {
    id: "react",
    icon: iconPath("react", "react-original.svg"),
    async test(dir) {
      return hasPackageDep(dir, "react");
    },
  },
  {
    id: "nodejs",
    icon: iconPath("nodejs", "nodejs-original.svg"),
    async test(dir) {
      return fileExists(dir, "package.json");
    },
  },

  // Backend Frameworks
  {
    id: "django",
    icon: iconPath("django", "django-plain.svg"),
    async test(dir) {
      return (await fileExists(dir, "manage.py")) || (await fileExists(dir, "settings.py"));
    },
  },
  {
    id: "flask",
    icon: iconPath("flask", "flask-original.svg"),
    async test(dir) {
      try {
        const reqPath = join(dir, "requirements.txt");
        const content = await (await import("fs/promises")).readFile(reqPath, "utf8");
        return content.toLowerCase().includes("flask");
      } catch {
        return false;
      }
    },
  },
  {
    id: "fastapi",
    icon: iconPath("fastapi", "fastapi-original.svg"),
    async test(dir) {
      try {
        const reqPath = join(dir, "requirements.txt");
        const content = await (await import("fs/promises")).readFile(reqPath, "utf8");
        return content.toLowerCase().includes("fastapi");
      } catch {
        return false;
      }
    },
  },
  {
    id: "spring",
    icon: iconPath("spring", "spring-original.svg"),
    async test(dir) {
      return (await fileExists(dir, "pom.xml")) || (await fileExists(dir, "build.gradle"));
    },
  },
  {
    id: "rails",
    icon: iconPath("rails", "rails-plain.svg"),
    async test(dir) {
      return (await fileExists(dir, "Gemfile")) && (await fileExists(dir, "config.ru"));
    },
  },

  // Languages
  {
    id: "python",
    icon: iconPath("python", "python-original.svg"),
    async test(dir) {
      return (
        (await fileExists(dir, "pyproject.toml")) ||
        (await fileExists(dir, "requirements.txt")) ||
        (await fileExists(dir, "setup.py"))
      );
    },
  },
  {
    id: "go",
    icon: iconPath("go", "go-original.svg"),
    async test(dir) {
      return fileExists(dir, "go.mod");
    },
  },
  {
    id: "rust",
    icon: iconPath("rust", "rust-original.svg"),
    async test(dir) {
      return fileExists(dir, "Cargo.toml");
    },
  },
  {
    id: "java",
    icon: iconPath("java", "java-original.svg"),
    async test(dir) {
      return (
        (await fileExists(dir, "pom.xml")) ||
        (await fileExists(dir, "build.gradle")) ||
        (await fileExists(dir, "build.gradle.kts"))
      );
    },
  },
  {
    id: "kotlin",
    icon: iconPath("kotlin", "kotlin-original.svg"),
    async test(dir) {
      const gradle = (await fileExists(dir, "build.gradle.kts")) || (await fileExists(dir, "settings.gradle.kts"));
      return gradle;
    },
  },
  {
    id: "ruby",
    icon: iconPath("ruby", "ruby-original.svg"),
    async test(dir) {
      return fileExists(dir, "Gemfile");
    },
  },
  {
    id: "php",
    icon: iconPath("php", "php-original.svg"),
    async test(dir) {
      return fileExists(dir, "composer.json");
    },
  },
  {
    id: "csharp",
    icon: iconPath("csharp", "csharp-original.svg"),
    async test(dir) {
      return (await fileExists(dir, "*.csproj")) || (await fileExists(dir, "*.sln"));
    },
  },
  {
    id: "swift",
    icon: iconPath("swift", "swift-original.svg"),
    async test(dir) {
      return (await fileExists(dir, "Package.swift")) || (await fileExists(dir, "*.xcodeproj"));
    },
  },
  {
    id: "elixir",
    icon: iconPath("elixir", "elixir-original.svg"),
    async test(dir) {
      return fileExists(dir, "mix.exs");
    },
  },
  {
    id: "dart",
    icon: iconPath("dart", "dart-original.svg"),
    async test(dir) {
      return fileExists(dir, "pubspec.yaml");
    },
  },
  {
    id: "flutter",
    icon: iconPath("flutter", "flutter-original.svg"),
    async test(dir) {
      try {
        const pubPath = join(dir, "pubspec.yaml");
        const content = await (await import("fs/promises")).readFile(pubPath, "utf8");
        return content.includes("flutter:");
      } catch {
        return false;
      }
    },
  },
  {
    id: "scala",
    icon: iconPath("scala", "scala-original.svg"),
    async test(dir) {
      return fileExists(dir, "build.sbt");
    },
  },
  {
    id: "haskell",
    icon: iconPath("haskell", "haskell-original.svg"),
    async test(dir) {
      return (await fileExists(dir, "stack.yaml")) || (await fileExists(dir, "cabal.project"));
    },
  },
];

export async function detectProjectType(dir: string) {
  for (const type of projectTypes) {
    try {
      if (await type.test(dir)) return type;
    } catch {
      // ignore detection errors
    }
  }
  return null;
}
