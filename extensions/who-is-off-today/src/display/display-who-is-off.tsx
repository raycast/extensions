import { List } from "@raycast/api";

function formatDate(date?: Date) {
    return date ? `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}` : "";
}

type Employee = {
    name: string;
    offUntil?: Date;
    offHours: number;
};
export type DisplayWhoIsOffArgs = {
    offs?: Employee[];
    today?: Date;
};
export default function DisplayWhoIsOff({ offs, today }: DisplayWhoIsOffArgs) {
    if (today == null) return <List isLoading={true}></List>;
    return (
        <List isLoading={offs == null}>
            {offs?.map((employee) => <DisplayEmployee employee={employee} today={today} />)}
        </List>
    );
}

function subtitle({ employee, today }: { employee: Employee; today: Date }) {
    const { offUntil, offHours } = employee;
    if (today.valueOf() === offUntil?.valueOf()) {
        if (offHours < 5) return `today for ${offHours} hours`;
        return `until end of today`;
    }
    return `until ${formatDate(offUntil)}`;
}

function DisplayEmployee({ employee, today }: { employee: Employee; today: Date }) {
    const { name } = employee;
    return <List.Item key={name} title={name} subtitle={subtitle({ employee, today })} />;
}
