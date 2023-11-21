declare module 'helpers' {
    interface Directory {
        dir: string;
        label: string;
    }

    export function getDirectories(): Directory[];
    export function getProjectDirectory(project: string): string;
}
