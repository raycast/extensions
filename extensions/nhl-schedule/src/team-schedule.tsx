import { ActionPanel, Detail, List, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";



function formatScheduleToMarkdown(schedule: any) {

    let markdownText = ``;

    return markdownText;
}

export default function Command() {
    console.log("Hello World!")
    var isLoading = true
    const { data } = useFetch("https://api-web.nhle.com/v1/standings/now") as { isLoading: boolean; data: any; };
    var teamSchedules: any = [];
    data.standings.forEach((teamStanding: any) => {
        const teamAbbrev = teamStanding.teamAbbrev.default;
        const { data } = useFetch(`https://api-web.nhle.com/v1/club-schedule-season/${teamAbbrev}/now`) as { isLoading: boolean; data: any; };

        teamSchedules.push({
            teamInfo: teamStanding,
            schedule: data
        });
    });
    


    console.log(data);
    const timeOptions: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit'
    };
    return (
        <List isLoading={isLoading} isShowingDetail>
            {teamSchedules.map((teamSchedule: any) => (
                <List.Item key={teamSchedule.teamInfo.teamAbbrev.default} title={`${teamSchedule.teamInfo.teamName} (${teamSchedule.teamInfo.teamAbbrev.default})`} subtitle={`${teamSchedule.teamInfo.divisionRank} in the ${teamSchedule.teamInfo.divisionName} Division`} detail={<List.Item.Detail markdown={formatScheduleToMarkdown(teamSchedule)}></List.Item.Detail>}></List.Item>
            ))}
        </List>
    );
}
