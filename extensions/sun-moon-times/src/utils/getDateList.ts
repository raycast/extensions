export function getDateList(currentDate: Date, rangeInMonths: number): Date[] {
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - rangeInMonths, 1)
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + rangeInMonths + 1, 0)
    const dates = []

    for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d))
    }

    return dates
}
