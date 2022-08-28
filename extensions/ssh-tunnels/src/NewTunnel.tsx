import { ActionPanel, Form, Action } from "@raycast/api";
import { useNavigation, showToast, Toast } from "@raycast/api";
import { setTimeout } from "timers/promises";
import { PortForward, open } from "./ssh";

interface FormData {
    type: "local" | "remote" | "dynamic";
    host: string;
    ports: string;
}

export default function NewTunnel() {
    const { pop } = useNavigation();

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm
                        title="Create Tunnel"
                        onSubmit={async (v) => {
                            const toast = await showToast({
                                style: Toast.Style.Animated,
                                title: "Creating tunnel",
                            });
                            const p = createTunnel(v as FormData);
                            const ac = new AbortController();

                            p.on("close", async (code) => {
                                if (code != 0) {
                                    toast.style = Toast.Style.Failure;
                                    toast.title = "Failed to create tunnel";
                                    ac.abort();
                                    pop();
                                }
                            });

                            try {
                                await setTimeout(1000, undefined, { signal: ac.signal });

                                p.removeAllListeners();
                                toast.style = Toast.Style.Success;
                                toast.title = "Created tunnel";
                                pop();
                            } catch {
                                console.log("Error Ignored");
                            }
                        }}
                    />
                </ActionPanel>
            }
        >
            <Form.Dropdown id="type" title="Tunnel Type">
                <Form.Dropdown.Item value="local" title="Local" />
                <Form.Dropdown.Item value="remote" title="Remote" />
                <Form.Dropdown.Item value="dynamic" title="Dynamic" />
            </Form.Dropdown>

            <Form.TextField id="host" title="Host" placeholder="ssh.host.com" />

            <Form.TextField id="ports" title="Ports" placeholder="[src:] [target_host:] dst" />
            <Form.Description text="Multiple ports can be entered separated by spaces." />
        </Form>
    );
}

function createTunnel(form: FormData) {
    const forwards: PortForward[] = [];
    for (const p of form.ports.split(" ")) {
        const c = p.split(":");

        switch (c.length) {
            case 1:
                forwards.push({
                    type: form.type,
                    src: Number(c[0]),
                    dst: Number(c[0]),
                    host: "localhost",
                });
                break;

            case 2:
                if (isNaN(Number(c[0]))) {
                    forwards.push({
                        type: form.type,
                        src: Number(c[1]),
                        dst: Number(c[1]),
                        host: c[0],
                    });
                } else {
                    forwards.push({
                        type: form.type,
                        src: Number(c[0]),
                        dst: Number(c[1]),
                        host: "localhost",
                    });
                }
                break;

            case 3:
                forwards.push({
                    type: form.type,
                    src: Number(c[0]),
                    dst: Number(c[2]),
                    host: c[1],
                });
                break;

            default:
                throw Error(`Failed to parse port (${p}).`);
        }
    }

    return open({
        host: form.host,
        fwds: forwards,
    });
}
