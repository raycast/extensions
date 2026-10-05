import { useForm } from "@raycast/utils";
import { Form, useNavigation, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import type { IUploaderConfigItem } from "picgo";
import { useEffect, useMemo, useState } from "react";
import getPicGoContext from "../util/context";

type Props = {
    picgo: ReturnType<typeof getPicGoContext>;
    type: string;
} & ({ mode: "create"; config?: undefined } | { mode: "update"; config: IUploaderConfigItem });

/**
 * Render a form for creating or updating an uploader configuration.
 *
 * Renders fields for the selected uploader type, populates initial values when `config` is provided,
 * validates required fields, and saves or renames the configuration via the provided `picgo` context.
 *
 * @param mode - "create" to add a new configuration or "update" to edit an existing one
 * @param type - The uploader type to display or preselect
 * @param config - Existing uploader configuration used to populate form fields when updating; omit for create mode
 * @param picgo - PicGo context exposing uploader list, item details, rename, and createOrUpdate operations
 * @returns The form UI for creating or editing an uploader configuration
 */
export default function ConfigEditForm({ mode, type, config, picgo }: Props) {
    const { getUploaderTypeList, getUploaderConfigItemDetails, renameConfig, createOrUpdateConfig } = picgo;
    const [uploader, setUploader] = useState<string>(type);
    const configItems = useMemo(() => {
        if (mode === "update") return getUploaderConfigItemDetails(type);
        return getUploaderConfigItemDetails(uploader);
    }, [uploader]);

    const { pop } = useNavigation();

    const { handleSubmit, setValue, itemProps } = useForm<IUploaderConfigItem>({
        onSubmit(value) {
            const configItemKeys = [...configItems.map((i) => i.name), "_configName"];
            for (const k in value) {
                if (configItemKeys.includes(k)) continue;
                delete value[k];
            }
            if (mode === "update" && value._configName !== config._configName)
                renameConfig(uploader, config._configName, value._configName);
            createOrUpdateConfig(uploader, value);
            pop();
            showToast({ title: "Save successfully", style: Toast.Style.Success });
        },
        validation: configItems.reduce(
            (acc, item) => {
                if (!item.required) return acc;
                acc[item.name] = (value: any) => {
                    if (!value) return `'${item.name}' is required`;
                };
                return acc;
            },
            {
                _configName: (v: string) => {
                    if (!v) return "Config name is required";
                },
            } as Record<string, any>,
        ),
        initialValues: { ...config },
    });

    useEffect(() => {
        // clear config when uploader type changes (different uploaders have different config forms)
        configItems.forEach((item) => {
            if (item.default) setValue(item.name, item.default);
            else setValue(item.name, undefined);
        });
    }, [uploader, configItems]);

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Save" icon={Icon.Checkmark} onSubmit={handleSubmit} />
                </ActionPanel>
            }
        >
            {config ? (
                <Form.Description key="_uploader" title="Uploader Type" text={type} />
            ) : (
                <Form.Dropdown
                    id="_uploader"
                    key="_uploader"
                    title="Uploader Type"
                    value={uploader}
                    onChange={(v) => setUploader(v)}
                >
                    {getUploaderTypeList().map((t) => (
                        <Form.Dropdown.Item key={t} title={t} value={t} />
                    ))}
                </Form.Dropdown>
            )}
            <Form.TextField
                title="Config Name *"
                id="_configName"
                key="_configName"
                {...itemProps._configName}
            ></Form.TextField>
            <Form.Separator />
            {configItems.map((item, i) => {
                switch (item.type) {
                    case "input":
                        return (
                            <Form.TextField
                                id={item.name}
                                key={`${item.name}-${i}`}
                                title={`${item.alias ?? item.name}${item.required ? " *" : ""}`}
                                placeholder={item.message ?? item.name}
                                {...itemProps[item.name]}
                            />
                        );
                    case "password":
                        return (
                            <Form.PasswordField
                                id={item.name}
                                key={`${item.name}-${i}`}
                                title={`${item.alias ?? item.name}${item.required ? " *" : ""}`}
                                placeholder={item.message ?? item.name}
                                {...itemProps[item.name]}
                            />
                        );
                    case "list":
                    case "checkbox":
                        return (
                            <Form.Dropdown
                                id={item.name}
                                key={`${item.name}-${i}`}
                                title={`${item.alias ?? item.name}${item.required ? " *" : ""}`}
                                placeholder={item.message ?? item.name}
                                {...itemProps[item.name]}
                            >
                                {item.choices?.map((choice) => (
                                    <Form.Dropdown.Item
                                        key={choice.name ?? choice.value ?? choice}
                                        title={choice.name ?? choice.value ?? choice}
                                        value={choice.value ?? choice}
                                    ></Form.Dropdown.Item>
                                ))}
                            </Form.Dropdown>
                        );
                    case "confirm":
                        return (
                            <Form.Checkbox
                                id={item.name}
                                key={`${item.name}-${i}`}
                                title={`${item.alias ?? item.name}${item.required ? " *" : ""}`}
                                label={item.message ?? item.alias ?? item.name}
                                {...itemProps[item.name]}
                            ></Form.Checkbox>
                        );
                }
            })}
        </Form>
    );
}
