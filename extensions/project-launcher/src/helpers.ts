import os from 'os';
import fs from 'fs';

interface Directory {
    dir: string;
    label: string;
}

const homeDir = os.userInfo().homedir;
const devDirs: string[] = ['Code/www', 'Code/personal'];

const _getDirectories = (path: string): Directory[] => {
    return fs
        .readdirSync(path, { withFileTypes: true })
        .filter((folder) => folder.isDirectory())
        .map((folder) => ({ dir: `${path}/${folder.name}`, label: folder.name }));
};

export function getDirectories(): Directory[] {
    return devDirs
        .map((dir) => `${homeDir}/${dir}`)
        .filter((dir) => fs.existsSync(dir))
        .flatMap((dir) => _getDirectories(dir));
}

export function getProjectDirectory(project: string): string {
    project = project.split('/').pop() || '';

    switch (project) {
        case 'mbe-hub':
            project = 'mbe';
            break;
        case 'rentandgo.it':
            project = 'rentandgo';
            break;
        case 'ability-art':
            project = 'abilityart';
            break;
        case 'dentaltoday':
            project = 'dental';
            break;
        case 'enac-veneto':
            project = 'enacveneto';
            break;
        case 'fondazione-enniodoris':
            project = 'enniodoris';
            break;
        case 'farmacie-gluten-free':
            project = 'farmacieglutenfree';
            break;
        case 'fondazione-mediolanum':
            project = 'fondazionemediolanum';
            break;
        case 'foodalert':
            project = 'safetyhud';
            break;
        case 'the-wine-net':
            project = 'thewinenet';
            break;
        case 'portale-ffc':
            project = 'ffc';
            break;
        default:
            project;
            break;
    }

    return project;
}
