import axios from "axios";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";

interface Preferences {
    apiKey: string;
}

export interface Person {
    id: string;
    displayName: string;
    email: string;
    jobTitle?: string;
    department?: string;
    tenureDuration?: string;
    reportsTo?: {
        id: string;
        displayName: string;
    };
}

const preferences = getPreferenceValues<Preferences>();
console.log("API Key (first 5 chars):", preferences.apiKey.substring(0, 5));

const api = axios.create({
    baseURL: "https://api.hibob.com",
    headers: {
        Authorization: preferences.apiKey,
        "Content-Type": "application/json",
    },
});

// Add this log to check the full URL being used
console.log("API URL:", `${api.defaults.baseURL}/api/employees`);

export async function getEmployees(): Promise<Person[]> {
    console.log("getEmployees called");
    try {
        console.log("API URL:", `${api.defaults.baseURL}/api/employees`);
        console.log("Request headers:", JSON.stringify(api.defaults.headers));

        const response = await api.get("/api/employees");
        console.log("API response status:", response.status);
        console.log("API response data (first 100 chars):", JSON.stringify(response.data).substring(0, 100));
        
        if (!response.data.employees || !Array.isArray(response.data.employees)) {
            console.error("Unexpected API response structure:", response.data);
            return [];
        }
        
        const people = response.data.employees.map((employee: any) => {
            console.log("Employee work data:", JSON.stringify(employee.work));
            return {
                id: employee.id,
                displayName: employee.displayName,
                email: employee.email,
                jobTitle: employee.work?.title,
                department: employee.work?.department,
                tenureDuration: employee.work?.tenureDuration?.humanize,
                reportsTo: employee.work?.reportsTo ? {
                    id: employee.work.reportsTo.id,
                    displayName: employee.work.reportsTo.displayName,
                } : undefined,
            };
        });
        
        console.log("Total employees found:", people.length);
        console.log("First employee (if any):", JSON.stringify(people[0], null, 2));
        return people;
    } catch (error) {
        console.error("Error in getEmployees:", error);
        if (axios.isAxiosError(error)) {
            console.error("Axios error details:", error.response?.data);
            if (error.response?.status === 401) {
                showToast(Toast.Style.Failure, "Authentication failed", "Please check your API key in preferences");
            } else if (error.response?.status === 403) {
                showToast(Toast.Style.Failure, "Access forbidden", "Your API key doesn't have the necessary permissions");
            } else {
                showToast(Toast.Style.Failure, "API request failed", error.message);
            }
        } else {
            showToast(Toast.Style.Failure, "An unexpected error occurred", String(error));
        }
        return [];
    }
}

export function filterEmployees(employees: Person[], query: string): Person[] {
    const lowercaseQuery = query.toLowerCase();
    return employees.filter(employee => 
        employee.displayName.toLowerCase().includes(lowercaseQuery) ||
        employee.email.toLowerCase().includes(lowercaseQuery) ||
        (employee.jobTitle && employee.jobTitle.toLowerCase().includes(lowercaseQuery))
    );
}

function isDateInRange(date: Date, start: Date, end: Date): boolean {
    const month = date.getMonth();
    const day = date.getDate();
    return (
        (month > start.getMonth() || (month === start.getMonth() && day >= start.getDate())) &&
        (month < end.getMonth() || (month === end.getMonth() && day <= end.getDate()))
    );
}

function formatDate(date: Date): string {
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}