import { Action, ActionPanel, Alert, Form, Toast, confirmAlert, showToast } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import fs from "fs";
import path from "path";
import { createLink, lstatOrUndefined, placementProblem } from "./links";
import { getSymlinks, saveSymlink } from "./storage";

interface FormValues {
    name: string;
    source: string[];
    destination: string[];
    replace: boolean;
}

const INITIAL_VALUES: FormValues = { name: "", source: [], destination: [], replace: false };

export default function Command() {
    const { handleSubmit, itemProps, setValidationError, reset } = useForm<FormValues>({
        initialValues: INITIAL_VALUES,
        validation: {
            name: (value) => (value?.trim() ? undefined : "Name is required"),
            source: (value) => {
                if (!value?.length) return "Choose a file or folder";
                if (!fs.existsSync(value[0])) return "Source does not exist";
            },
            destination: (value) => {
                if (!value?.length) return "Choose a folder";
                if (!fs.existsSync(value[0])) return "Destination does not exist";
                if (!fs.statSync(value[0]).isDirectory()) return "Destination must be a folder";
            },
        },
        async onSubmit(values) {
            // Errors set below aren't cleared by the field validators, so start each submit clean.
            setValidationError("name", undefined);
            setValidationError("destination", undefined);

            const name = values.name.trim();
            const source = path.resolve(values.source[0]);
            const destinationDir = path.resolve(values.destination[0]);
            const linkPath = path.join(destinationDir, path.basename(source));
            const linkName = path.basename(linkPath);

            try {
                if (getSymlinks().some((s) => s.name === name)) {
                    setValidationError("name", "A symlink with this name already exists");
                    return false;
                }
                const problem = placementProblem(source, destinationDir);
                if (problem) {
                    setValidationError("destination", problem);
                    return false;
                }

                const existing = lstatOrUndefined(linkPath);
                if (existing && !existing.isSymbolicLink()) {
                    setValidationError("destination", `"${linkName}" already exists here and is not a symlink`);
                    return false;
                }
                if (existing && !values.replace) {
                    setValidationError("destination", `A symlink named "${linkName}" already exists here`);
                    return false;
                }
                if (existing) {
                    const confirmed = await confirmAlert({
                        title: "Replace existing symlink?",
                        message: `${linkPath} points to ${fs.readlinkSync(linkPath)}. Only the link is replaced; what it points to is not touched.`,
                        primaryAction: { title: "Replace", style: Alert.ActionStyle.Destructive },
                    });
                    if (!confirmed) return false;
                }

                await createLink(source, linkPath, existing !== undefined, () =>
                    saveSymlink({ name, source, destination: linkPath }),
                );

                await showToast({ style: Toast.Style.Success, title: "Symlink created", message: linkPath });
                reset(INITIAL_VALUES);
            } catch (error) {
                await showFailureToast(error, { title: "Failed to create symlink" });
                return false;
            }
        },
    });

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Create Symlink" onSubmit={handleSubmit} />
                </ActionPanel>
            }
        >
            <Form.Description text="Create a new symbolic link." />
            <Form.TextField title="Name" placeholder="A friendly name" {...itemProps.name} />
            <Form.FilePicker
                title="Source"
                info="The file or folder the link points to"
                allowMultipleSelection={false}
                canChooseDirectories
                canChooseFiles
                {...itemProps.source}
            />
            <Form.FilePicker
                title="Destination"
                info="The folder the link is created in. It gets the same name as the source."
                allowMultipleSelection={false}
                canChooseDirectories
                canChooseFiles={false}
                {...itemProps.destination}
            />
            <Form.Checkbox
                title="Force Creation"
                label="Replace an existing symlink with the same name"
                info="Only symlinks are replaced. A real file or folder is never overwritten."
                {...itemProps.replace}
            />
        </Form>
    );
}
