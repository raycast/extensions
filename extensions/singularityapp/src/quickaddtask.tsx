import { Toast, showToast } from "@raycast/api";
import { exec } from "child_process";

interface Task {
    title: string;
    description?: string;
}

async function sendTaskToServer(task: Task) {
    return new Promise((resolve, reject) => {
        // Команда для отправки задачи через ssh, используя sshpass для автоматической передачи пароля
        const sshCommand = `ssh -p 2022 retrobanner@gkogan.ddns.net "echo '${task.description}' | mail -s '${task.title}' tasksja5bpu#ru@singularity-app.com"`;

        exec(sshCommand, (error, stdout, stderr) => {
            if (error) {
                reject(`Ошибка выполнения SSH команды: ${stderr}`);
            } else {
                resolve("Задача отправлена");
            }
        });
    });
}

export default async function main(props: { arguments: { title: string; description?: string } }) {
    const { title, description } = props.arguments;

    try {
        await sendTaskToServer({ title, description });
        await showToast(Toast.Style.Success, "Задача добавлена успешно!");
    } catch (error) {
        await showToast(Toast.Style.Failure, "Ошибка при добавлении задачи", String(error));
    }
}
