export const serviceIds = ["all", "g1", "e1", "s1", "s2", "s5", "s6"] as const;
export const serviceIdsWithoutAll = ["g1", "e1", "s1", "s2", "s5", "s6"] as const;
export type ServiceId = (typeof serviceIds)[number];

type ServiceLogo = {
  url: string;
  width: string;
  height: string;
};

type Service = {
  id: ServiceId;
  name: string;
  logo_s: ServiceLogo;
  logo_m: ServiceLogo;
  logo_l: ServiceLogo;
};

type Area = {
  id: string;
  name: string;
};

export type Program = {
  id: string;
  event_id: string;
  start_time: string;
  end_time: string;
  area: Area;
  service: Service;
  title: string;
  subtitle: string;
  content: string;
  act: string;
  genres: Genre[];
};

export type ServicePrograms = {
  [key in ServiceId]: Program[];
};

export type TVSchedule = {
  list: ServicePrograms;
};

export const genreMajorCategories = [
  "00",
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "14",
  "15",
] as const;
export type GenreMajorCategory = (typeof genreMajorCategories)[number];
export const genreMajorCategoryLabels = {
  "00": "News / Report",
  "01": "Sports",
  "02": "Information / Tabloid show",
  "03": "Drama",
  "04": "Music",
  "05": "Variety show",
  "06": "Movies",
  "07": "Animation / Special effect movies",
  "08": "Documentary / Culture",
  "09": "Theatre / Public performance",
  "10": "Hobby / Education",
  "11": "Welfare",
  "14": "For extension",
  "15": "Others",
} satisfies Record<GenreMajorCategory, string>;

// prettier-ignore
export const genres = [
  "0000", "0001", "0002", "0003", "0004", "0005", "0006", "0007", "0008", "0009", "0010", "0015",
  "0100", "0101", "0102", "0103", "0104", "0105", "0106", "0107", "0108", "0109", "0110", "0115",
  "0200", "0201", "0202", "0203", "0204", "0205", "0206", "0207", "0215",
  "0300", "0301", "0302", "0315",
  "0400", "0401", "0402", "0403", "0404", "0405", "0406", "0407", "0408", "0409", "0410", "0415",
  "0500", "0501", "0502", "0503", "0504", "0505", "0506", "0515",
  "0600", "0601", "0602", "0615",
  "0700", "0701", "0702", "0715",
  "0800", "0801", "0802", "0803", "0804", "0805", "0806", "0807", "0808", "0815",
  "0900", "0901", "0902", "0903", "0904", "0915",
  "1000", "1001", "1002", "1003", "1004", "1005", "1006", "1007", "1008", "1009", "1010", "1011", "1012", "1015",
  "1100", "1101", "1102", "1103", "1104", "1105", "1106", "1115",
  "1400", "1401", "1403", "1404",
  "1515"
] as const;
export type Genre = (typeof genres)[number];

export const genreLabels = {
  "0000": "Regular, General",
  "0001": "Weather report",
  "0002": "Special program, Documentary",
  "0003": "Politics, National assembly",
  "0004": "Economics, Market report",
  "0005": "Overseas, International report",
  "0006": "News analysis",
  "0007": "Discussion, Conference",
  "0008": "Special report",
  "0009": "Local program",
  "0010": "Traffic report",
  "0015": "Others (News/reports)",
  "0100": "Sports news",
  "0101": "Baseball",
  "0102": "Soccer",
  "0103": "Golf",
  "0104": "Other ball games",
  "0105": "Sumo, Combative sports",
  "0106": "Olympic, International games",
  "0107": "Marathon, Athletic sports, Swimming",
  "0108": "Motor sports",
  "0109": "Marine sports, Winter sports",
  "0110": "Horse race, Public race",
  "0115": "Others (Sports)",
  "0200": "Gossip/Tabloid show",
  "0201": "Fashion",
  "0202": "Living, Home",
  "0203": "Health, Medical treatment",
  "0204": "Shopping, Mail-order business",
  "0205": "Gourmet, Cooking",
  "0206": "Events",
  "0207": "Program guide, Information",
  "0215": "Others (Information/tabloid show)",
  "0300": "Japanese dramas",
  "0301": "Overseas dramas",
  "0302": "Period dramas",
  "0315": "Others (Dramas)",
  "0400": "Japanese rock, Pop music",
  "0401": "Overseas rock, Pop music",
  "0402": "Classic, Opera",
  "0403": "Jazz, Fusion",
  "0404": "Popular songs, Japanese popular songs (enka songs)",
  "0405": "Live concert",
  "0406": "Ranking, Request music",
  "0407": "Karaoke, Amateur singing contests",
  "0408": "Japanese ballad, Japanese traditional music",
  "0409": "Children's song",
  "0410": "Folk music, World music",
  "0415": "Others (Music)",
  "0500": "Quiz",
  "0501": "Game",
  "0502": "Talk variety",
  "0503": "Comedy program",
  "0504": "Music variety",
  "0505": "Tour variety",
  "0506": "Cooking variety",
  "0515": "Others (Variety)",
  "0600": "Overseas movies",
  "0601": "Japanese movies",
  "0602": "Animation",
  "0615": "Others (Movies)",
  "0700": "Japanese animation",
  "0701": "Overseas animation",
  "0702": "Special effects",
  "0715": "Others (Animation, Special effects)",
  "0800": "Social, Current events",
  "0801": "History, Travel record",
  "0802": "Nature, Animal, Environment",
  "0803": "Space, Science, Medical science",
  "0804": "Culture, Traditional culture",
  "0805": "Literature, Literary art",
  "0806": "Sports",
  "0807": "Total documentary",
  "0808": "Interviews, Discussions",
  "0815": "Others (Documentary/culture)",
  "0900": "Modern drama, Western-style drama",
  "0901": "Musical",
  "0902": "Dance, Ballet",
  "0903": "Comic story, Entertainment",
  "0904": "Kabuki, Classical drama",
  "0915": "Others (Theatre, Public performance)",
  "1000": "Trip, Fishing, Outdoor entertainment",
  "1001": "Gardening, Pet, Handicrafts",
  "1002": "Music, Art, Industrial art",
  "1003": "Japanese chess (shogi) and 'go'",
  "1004": "Mah-jong, Pinball games",
  "1005": "Cars, Motorbikes",
  "1006": "Computer, TV games",
  "1007": "Conversation, Languages",
  "1008": "Little children, Schoolchildren",
  "1009": "Junior high school and high school students",
  "1010": "University students, Examinations",
  "1011": "Lifelong education, Qualifications",
  "1012": "Educational problem",
  "1015": "Others (Hobby/education)",
  "1100": "Old aged persons",
  "1101": "Handicapped persons",
  "1102": "Social welfare",
  "1103": "Volunteers",
  "1104": "Sign language",
  "1105": "Text (subtitles)",
  "1106": "Explanation on sound multiplex broadcast",
  "1115": "Others (Welfare)",
  "1400": "Appendix information for BS/Terrestrial digital broadcast program",
  "1401": "Extension for broadband CS digital broadcasting",
  "1403": "Appendix information for server-type program",
  "1404": "Appendix information for IP broadcast program",
  "1515": "Others",
};

export const serviceIdLogos = {
  all: "",
  g1: "https://www.nhk.or.jp/common/img/media/gtv-100x50.png",
  e1: "https://www.nhk.or.jp/common/img/media/etv-100x50.png",
  s1: "https://www.nhk.or.jp/common/img/media/bs1-100x50.png",
  s2: "https://www.nhk.or.jp/common/img/media/bs1m-100x50.png",
  s5: "https://www.nhk.or.jp/common/img/media/bs4k-100x50.png",
  s6: "https://www.nhk.or.jp/common/img/media/bs8k-100x50.png",
} satisfies { [key in ServiceId]: string };

export const serviceIdLabels = {
  all: "All Services",
  g1: "NHK General",
  e1: "NHK Educational",
  s1: "NHK BS",
  s2: "NHK BS (102ch)",
  s5: "NHK BS Premium 4K",
  s6: "NHK BS 8K",
} satisfies { [key in ServiceId]: string };

export type ErrorResponseBody = {
  error: {
    code: number;
    message: string;
  };
};
