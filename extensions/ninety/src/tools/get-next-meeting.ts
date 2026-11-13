import { getNextMeeting } from "../api/ninety";
import { meetingTypeTitle, personName } from "../lib/format";

type Input = {
  /** Team Id from get-teams. */
  teamId: string;
};

export default async function tool({ teamId }: Input) {
  const meeting = await getNextMeeting(teamId);
  if (!meeting) return { scheduled: false, message: "No Meeting is scheduled for this Team in the next few weeks." };
  return {
    scheduled: true,
    type: meetingTypeTitle(meeting.meetingType),
    name: meeting.agendaName,
    teamName: meeting.teamName,
    scheduledDate: meeting.scheduledDate,
    cadence: meeting.cadence,
    presenter: personName(meeting.presenter) || undefined,
    scribe: personName(meeting.scribe) || undefined,
    agenda: [...meeting.agenda]
      .sort((a, b) => a.ordinal - b.ordinal)
      .map((item) => ({ section: item.name, minutes: Math.round(item.durationSeconds / 60) })),
    attendees: meeting.attendees.map((person) => personName(person)).filter(Boolean),
  };
}
