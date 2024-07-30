import axios from "axios";
import * as cheerio from "cheerio";

type Lecture = {
  classroom: string;
  class: string;
  time: string;
  instructor: string;
  className: string;
  imgSrc: string;
  classType: string;
  zoomLink?: string;
};

export const fetchLectures = async (): Promise<Lecture[]> => {
  const INFOSCREEN_URL = "https://infoscreen.sae.ch/";
  const { data } = await axios.get(INFOSCREEN_URL);
  const $ = cheerio.load(data);

  const lectures: Lecture[] = [];
  const CLASS_NAME = ".unterrichtsBox_Klasse";
  const CLASS_TIME_AND_ROOM = ".unterrichtsBox_Uhrzeit";
  const CLASS_AND_INSTRUCTOR = ".unterrichtsBox_UnterrichtUndDozent";
  const CLASS_IMAGE = ".saeIconsKlasse";

  const zoomLinks: Record<string, string> = {};
  $(".navigation_display ul li a").each((i, elem) => {
    const classroomName = $(elem).text().trim();
    const zoomLink = $(elem).attr("href");
    if (classroomName && zoomLink) {
      zoomLinks[classroomName] = zoomLink;
    }
  });

  $(".unterrichtsBox").each((i, elem) => {
    const classImage = $(elem).find(CLASS_IMAGE).attr("src");
    const classNameText = $(elem).find(CLASS_NAME).text().trim();
    const classTimeAndRoom = $(elem).find(CLASS_TIME_AND_ROOM).text().trim();
    const classAndInstructor = $(elem).find(CLASS_AND_INSTRUCTOR).text().trim();

    const classDescription = classAndInstructor.replace(/\s*\((onCampus|hybrid|online)\s*$/, "");
    const classDescriptionSplit = classDescription.split(" - ");
    const instructor = classDescription.split("·")[1]?.trim() || "";
    const classType = classDescription.split("(")[1]?.split(")")[0] || "Unknown";

    const timeClassroomRegex = /^(.+?)\s*·\s*(.+)$/;
    const matchTimeClassroom = classTimeAndRoom.match(timeClassroomRegex);

    let time = "";
    let classroom = "";

    if (matchTimeClassroom) {
      time = matchTimeClassroom[1];
      classroom = matchTimeClassroom[2];
    }

    lectures.push({
      classroom,
      class: classDescriptionSplit[0].trim(),
      time,
      instructor,
      className: classNameText,
      imgSrc: classImage ? `https://infoscreen.sae.ch/${classImage}` : "https://placehold.co/200x200",
      classType,
      zoomLink: zoomLinks[classroom],
    });
  });

  return lectures;
};
