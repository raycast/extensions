// src/index.tsx
import { ActionPanel, List, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import * as ShodanAPI from "./api";

export default function Command() {
    const [isLoading, setIsLoading] = useState(false);

    const categories = [
        "Search Methods",
        "On-Demand Scanning",
        "Network Alerts",
        "Notifiers",
        "Directory Methods",
        "Bulk Data (Enterprise)",
        "Manage Organization (Enterprise)",
        "Account Methods",
        "DNS Methods",
        "Utility Methods",
        "API Status Methods",
    ];

    return (
        <List isLoading={isLoading}>
            {categories.map((category) => (
                <List.Item
                    key={category}
                    title={category}
                    actions={
                        <ActionPanel>
                            <Action.Push title="View Methods" target={<CategoryView category={category} />} />
                        </ActionPanel>
                    }
                />
            ))}
        </List>
    );
}

function CategoryView({ category }: { category: string }) {
    const methods = ShodanAPI.getMethodsByCategory(category);

    return (
        <List>
            {methods.map((method) => (
                <List.Item
                    key={method.name}
                    title={method.name}
                    subtitle={method.description}
                    actions={
                        <ActionPanel>
                            <Action.Push title="Execute Method" target={<MethodView method={method} />} />
                        </ActionPanel>
                    }
                />
            ))}
        </List>
    );
}

function MethodView({ method }: { method: ShodanAPI.Method }) {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const executeMethod = async () => {
        setIsLoading(true);
        try {
            const response = await method.execute();
            setResult(response);
            showToast(Toast.Style.Success, "Method executed successfully");
        } catch (error) {
            showToast(Toast.Style.Failure, "Failed to execute method", String(error));
        }
        setIsLoading(false);
    };

    return (
        <List isLoading={isLoading}>
            <List.Item
                title="Execute Method"
                actions={
                    <ActionPanel>
                        <Action title="Execute" onAction={executeMethod} />
                    </ActionPanel>
                }
            />
            {result && (
                <List.Item
                    title="Result"
                    detail={<List.Item.Detail markdown={`\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``} />}
                />
            )}
        </List>
    );
}
