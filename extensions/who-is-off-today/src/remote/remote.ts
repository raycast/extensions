import { isoDate } from "../utils/date";
import { RemoteApi } from "./api/api";
import { TimeOff } from "./api/models/timeoff";

type OffEmployee = {
    name: string;
    offUntil: Date;
    offHours: number;
};

function offHoursAt(asd: TimeOff, at: Date) {
    const isoAt = isoDate(at);
    return asd.timeoff_days.find(({ day }) => day === isoAt)?.hours;
}

export class Remote {
    constructor(private _api: RemoteApi) {}

    async offEmployees(at: Date): Promise<OffEmployee[]> {
        const employees = (await this._api.listEmployments().allPages()).flatMap((_) => _.employments);
        const timeOffs = (await this._api.listTimeOffs({ status: "approved" }).allPages()).flatMap((_) => _.timeoffs);

        const isoAt = isoDate(at);

        return employees
            .map((employee) => {
                const offAt = timeOffs
                    .filter((_) => _.employment_id === employee.id)
                    .find((_) => _.timeoff_days.find(({ day }) => day === isoAt));
                if (offAt == null) return;
                return {
                    name: employee.full_name,
                    offUntil: new Date(offAt.end_date),
                    offHours: offHoursAt(offAt, at),
                };
            })
            .filter((_) => _ != null) as OffEmployee[];
    }
}
