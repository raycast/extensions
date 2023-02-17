interface Country {
  emoji: string;
  name: string;
  code: string;
}

interface Holiday {
  name: string;
  altName?: string;
  date: string;
  readableDate: string;
}

interface HolidaysResponse {
  count: number;
  holidays: Array<Holiday>;
}

interface Photo {
  url: string;
  description?: string;
  alt_description?: string;
  link: string;
  author: {
    name: string;
    link: string;
  };
}
