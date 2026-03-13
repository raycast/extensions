import { authenticator } from "otplib";
import { URL } from "url";
import { WebUntisQR, Lesson as UntisLesson } from "webuntis";
import { toTitleCase, useSettings } from "./util";

export type LessonStatus = "finished" | "active" | "upcoming";

export type Subject = {
  id: string;
  short: string;
  long: string;
};

export type Lesson = {
  id: string;
  date: Date;
  endDate: Date;
  status: LessonStatus;
  room: string;
  subject: Subject;
  teacher: string;
  cancelled: boolean;
  info?: string;
  original: UntisLesson;
};

export type Timetable = Lesson[];

const untis = async () => {
  const { school, key, schoolNumber, username, url } = useSettings();

  const qrData = `untis://setschool?url=${encodeURIComponent(url.trim())}&school=${encodeURIComponent(school.trim())}&user=${encodeURIComponent(username.trim())}&key=${encodeURIComponent(key)}&schoolNumber=${encodeURIComponent(schoolNumber.trim())}`;

  const untis = new WebUntisQR(qrData, "RaycastUntis", authenticator, URL);

  await untis.login();

  return untis;
};

export default untis;

export const getTimetable = async (date: Date): Promise<Timetable> => {
  const client = await untis();

  const timetable = await client.getOwnTimetableFor(date);

  return timetable
    .map((value) => {
      const subject = value.su[0];

      const startDate = {
        year: Math.floor(value.date / 10000),
        month: Math.floor(value.date / 100) % 100,
        day: value.date % 100,
        hour: Math.floor(value.startTime / 100),
        minute: value.startTime % 100,
      };

      const endDateObject = {
        year: Math.floor(value.date / 10000),
        month: Math.floor(value.date / 100) % 100,
        day: value.date % 100,
        hour: Math.floor(value.endTime / 100),
        minute: value.endTime % 100,
      };

      const date = new Date(startDate.year, startDate.month - 1, startDate.day, startDate.hour, startDate.minute);
      const endDate = new Date(
        endDateObject.year,
        endDateObject.month - 1,
        endDateObject.day,
        endDateObject.hour,
        endDateObject.minute,
      );

      const now = new Date();

      let status: LessonStatus = "upcoming";

      if (now > endDate) {
        status = "finished";
      }

      if (now > date && now < endDate) {
        status = "active";
      }

      return {
        id: String(value.id),
        date,
        endDate,
        status,
        subject: {
          id: String(subject.id),
          short: subject.name.replace(/\d/g, "").split("_")[0],
          long: subject.longname,
        },
        room: value.kl[0].longname,
        cancelled: value.code == "cancelled",
        info: value.info,

        teacher: toTitleCase(value.te.map((s) => s.longname).join(", ")),
        original: value,
      } satisfies Lesson;
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());
};
