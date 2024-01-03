import { exec } from 'node:child_process'

export default async function execute(command: string) {
    return new Promise((resolve, reject) => {
        exec(command, (error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve('Success');
        })
    });
}