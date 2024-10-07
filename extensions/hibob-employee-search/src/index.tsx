import { List, showToast, Toast, Action, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { getEmployees, filterEmployees, Person } from "./hibob";

export default function Command() {
    const [allEmployees, setAllEmployees] = useState<Person[]>([]);
    const [filteredEmployees, setFilteredEmployees] = useState<Person[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchText, setSearchText] = useState("");

    useEffect(() => {
        async function fetchData() {
            console.log("Fetching employee data...");
            try {
                const data = await getEmployees();
                console.log("Fetched employees:", data.length);
                setAllEmployees(data);
                setFilteredEmployees(data);
            } catch (error) {
                console.error("Error fetching employees:", error);
                showToast(Toast.Style.Failure, "Failed to fetch employees", String(error));
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, []);

    useEffect(() => {
        console.log("Search text changed:", searchText);
        const filtered = filterEmployees(allEmployees, searchText);
        console.log("Filtered employees:", filtered.length);
        setFilteredEmployees(filtered);
    }, [searchText, allEmployees]);

    const copyToClipboard = async (displayName: string) => {
        await Clipboard.copy(displayName);
        showToast(Toast.Style.Success, "Copied to clipboard", displayName);
    };

    console.log("Rendering component. All Employees:", allEmployees.length, "Filtered Employees:", filteredEmployees.length, "Loading:", isLoading, "Search:", searchText);

    return (
        <List
            isLoading={isLoading}
            onSearchTextChange={setSearchText}
            searchBarPlaceholder="Search employees..."
        >
            {filteredEmployees.length === 0 ? (
                <List.EmptyView title="No employees found" description="Try adjusting your search" />
            ) : (
                filteredEmployees.map((person) => (
                    <List.Item
                        key={person.id}
                        title={person.displayName}
                        subtitle={person.tenureDuration || "Tenure unknown"}
                        accessories={[
                            { text: typeof person.jobTitle === 'string' ? person.jobTitle : "No Job Title" },
                            { text: person.reportsTo ? `Reports to: ${person.reportsTo.displayName}` : "No manager" },
                        ]}
                        actions={
                            <Action
                                title="Copy Name"
                                onAction={() => copyToClipboard(person.displayName)}
                            />
                        }
                    />
                ))
            )}
        </List>
    );
}