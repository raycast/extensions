import {
  ActionPanel,
  Detail,
  getPreferenceValues,
  ImageMask,
  List,
  OpenAction,
} from '@raycast/api';
import {
  readdirSync,
  readFileSync,
} from 'fs';
import {
  PackageJSONInterface,
  PreferencesInterface,
  ProjectInterface,
} from './types';

const ignoreList: Array<string> = [
  '.DS_Store',
];

const formatPackageJSON = (parsed: PackageJSONInterface) => {
  return {
    name: parsed.title || parsed.name || null,
    description: parsed.description || parsed.version || parsed.author,
    icon: pickIcon(parsed),
  };
};

const checkForPackageJSON = (devDirPath: string, dir: string) => {
  try {
    const raw: string = readFileSync(`${devDirPath}/${dir}/package.json`).toString();
    const parsed: PackageJSONInterface = JSON.parse(raw);
    const formatted = formatPackageJSON(parsed);
    return {
      raw,
      parsed,
      formatted,
    }
  } catch (e) {
    return null;
  }
}

const pickIcon = (packageJSON: PackageJSONInterface) => {
  const raw = JSON.stringify(packageJSON);

  // The order of the if's here are in an attempt to
  // get the most specific form of a node project.
  // ex: next is before react because next is a specific
  // implementation of react.
  if (raw.includes('next')) {
    return 'nextjs.png';
  }

  if (raw.includes('react')) {
    return 'react.png';
  }

  if (raw.includes('vue')) {
    return 'vue.png';
  }

  if (raw.includes('graphql')) {
    return 'graphql-small.png';
  }

  return 'nodejs.png';
}

const getDevDirProjects = (devDir: string): Array<string> => {
  const projectDirs: Array<string> = readdirSync(devDir);
  const filteredProjectDirs: Array<string> = projectDirs.filter((dir: string) => !ignoreList.includes(dir));
  return filteredProjectDirs;
};

const createConfigForNodeProjects = (devDir: string, projectDirs: Array<string>): Array<ProjectInterface> => {
  const projects: Array<ProjectInterface> = [];

   projectDirs.forEach((dir: string) => {
    const json = checkForPackageJSON(devDir, dir);

    if (!json) {
      return;
    }

    const {
      formatted,
    } = json;

    const projectConfig: ProjectInterface = {
      name: formatted.name || dir,
      description: formatted.description || '',
      icon: formatted.icon || 'nodejs.png',
      target: `${devDir}/${dir}`,
    };

    projects.push(projectConfig);
  });

  return projects;
};

const Dev = () => {
  const {
    devDir,
  }: PreferencesInterface = getPreferenceValues();
  let projectDirs;
  let projects;

  try {
    projectDirs = getDevDirProjects(devDir);
  }
  catch {
    return <Detail markdown={"Error finding project directories."}/>;
  }

  try {
    projects = createConfigForNodeProjects(devDir, projectDirs);
  } catch {
    return <Detail markdown={"Error building projects list data."} />;
  }

  return <List>
    {
      projects.map(({
        name,
        description,
        icon,
        target
      }) => (
        <List.Item
          key={name}
          icon={{ source: icon, mask: ImageMask.RoundedRectangle }}
          title={name}
          accessoryTitle={description}
          actions={<ActionPanel>
            <OpenAction
              title="Open project in VSCode"
              icon="vscode.png"
              target={target}
              application="Visual Studio Code"
            />
            <OpenAction
              title="Open Hyper at this projects path"
              icon="hyper.png"
              target={target}
              application="Hyper"
            />
          </ActionPanel>}
        />
      ))
    }
  </List>;
};

export default Dev;
