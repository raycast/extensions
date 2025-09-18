import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { NodeProject, ProjectScript } from './types';

export async function scanForProjects(
  rootDirectories: string[]
): Promise<NodeProject[]> {
  const projects: NodeProject[] = [];

  for (const rootDir of rootDirectories) {
    try {
      const foundProjects = await scanDirectory(rootDir);
      projects.push(...foundProjects);
    } catch (error) {
      console.error(`Error scanning directory ${rootDir}:`, error);
    }
  }

  return projects;
}

async function scanDirectory(dirPath: string): Promise<NodeProject[]> {
  const projects: NodeProject[] = [];

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const subProjects = await scanDirectory(fullPath);
        projects.push(...subProjects);
      } else if (entry.name === 'package.json') {
        try {
          const packageJsonContent = await readFile(fullPath, 'utf-8');
          const packageJson = JSON.parse(packageJsonContent);

          if (packageJson.scripts && typeof packageJson.scripts === 'object') {
            const projectName =
              packageJson.name ||
              entry.name.replace('package.json', '').trim() ||
              'unnamed-project';
            projects.push({
              name: projectName,
              path: dirPath,
              scripts: packageJson.scripts,
            });
          }
        } catch (error) {
          console.error(`Error reading package.json at ${fullPath}:`, error);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }

  return projects;
}

export function flattenProjectsToScripts(
  projects: NodeProject[]
): ProjectScript[] {
  const scripts: ProjectScript[] = [];

  for (const project of projects) {
    for (const [scriptName, scriptCommand] of Object.entries(project.scripts)) {
      scripts.push({
        projectName: project.name,
        scriptName,
        scriptCommand,
        projectPath: project.path,
      });
    }
  }

  return scripts;
}
