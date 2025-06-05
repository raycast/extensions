export interface LGTMGif {
  id: string;
  title: string;
  url: string;
  category: string;
}

export const CATEGORIES = [
  "All",
  "Classic LGTM",
  "Celebratory",
  "Movies & TV",
  "Memes & Internet Culture",
  "Animals",
  "Tech & Gaming",
  "Sports"
] as const;

export type Category = typeof CATEGORIES[number];

export const LGTM_GIFS: LGTMGif[] = [
  {
    id: "1",
    title: "Thumbs Up - Lighter",
    url: "https://media3.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4NW9xZzlwNHdwdzd0c2o1bjI5dWU1Yjc3bWZlMnBwa293c3lvNmwzYyZlcD12MV9naWZzJmN0PWc/UmkNfWnDh8JYk/giphy.gif",
    category: "Classic LGTM"
  },
  {
    id: "2",
    title: "Clap Reaction",
    url: "https://media4.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4NW9xZzlwNHdwdzd0c2o1bjI5dWU1Yjc3bWZlMnBwa293c3lvNmwzYyZlcD12MV9naWZzJmN0PWc/bp0fLZr8kFz4Bm4kRV/giphy.gif",
    category: "Celebratory"
  },
  {
    id: "3",
    title: "Joey Nice",
    url: "https://media3.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4a3hraWJiN3FtNDAyN2NmZWFmMTR5dHMxcGxxYWRubGg1ZGQ2NTg2MSZlcD12MV9naWZzJmN0PWc/ftYpwfV6ZcerEa8poV/giphy.gif",
    category: "Movies & TV"
  },
  {
    id: "4",
    title: "Palpatine Well Done",
    url: "https://media2.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4a3hraWJiN3FtNDAyN2NmZWFmMTR5dHMxcGxxYWRubGg1ZGQ2NTg2MSZlcD12MV9naWZzJmN0PWc/9g8PH1MbwTy4o/giphy.gif",
    category: "Movies & TV"
  },
  {
    id: "5",
    title: "Anime Nice",
    url: "https://media0.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4NW9xZzlwNHdwdzd0c2o1bjI5dWU1Yjc3bWZlMnBwa293c3lvNmwzYyZlcD12MV9naWZzJmN0PWc/Y01jP8QeLOox2/giphy.gif",
    category: "Memes & Internet Culture"
  },
  {
    id: "6",
    title: "Crazy Eyes",
    url: "https://media3.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4a3hraWJiN3FtNDAyN2NmZWFmMTR5dHMxcGxxYWRubGg1ZGQ2NTg2MSZlcD12MV9naWZzJmN0PWc/WnCIKJ8qdT0NJHMn3p/giphy.gif",
    category: "Memes & Internet Culture"
  },
  {
    id: "7",
    title: "I Love It Guy",
    url: "https://media4.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4a3hraWJiN3FtNDAyN2NmZWFmMTR5dHMxcGxxYWRubGg1ZGQ2NTg2MSZlcD12MV9naWZzJmN0PWc/1xpm1qOK7WuQeuK6Ub/giphy.gif",
    category: "Memes & Internet Culture"
  },
  {
    id: "8",
    title: "Rocket Thumb",
    url: "https://media2.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4NW9xZzlwNHdwdzd0c2o1bjI5dWU1Yjc3bWZlMnBwa293c3lvNmwzYyZlcD12MV9naWZzJmN0PWc/Khl6ohcDKErosSbs9M/giphy.gif",
    category: "Tech & Gaming"
  },
  {
    id: "9",
    title: "Ceelo Bless",
    url: "https://media4.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4NW9xZzlwNHdwdzd0c2o1bjI5dWU1Yjc3bWZlMnBwa293c3lvNmwzYyZlcD12MV9naWZzJmN0PWc/UyP098SqfNlETuiFhG/giphy.gif",
    category: "Celebratory"
  },
  {
    id: "10",
    title: "Biden Smile",
    url: "https://media2.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4a3hraWJiN3FtNDAyN2NmZWFmMTR5dHMxcGxxYWRubGg1ZGQ2NTg2MSZlcD12MV9naWZzJmN0PWc/yMZZEJgHe3r2pipU7u/giphy.gif",
    category: "Classic LGTM"
  },
  {
    id: "11",
    title: "Nacho I Love It",
    url: "https://media4.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4a3hraWJiN3FtNDAyN2NmZWFmMTR5dHMxcGxxYWRubGg1ZGQ2NTg2MSZlcD12MV9naWZzJmN0PWc/rcqxcl5DGhM9q/giphy.gif",
    category: "Movies & TV"
  },
  {
    id: "12",
    title: "Nod LGTM",
    url: "https://media4.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4a3hraWJiN3FtNDAyN2NmZWFmMTR5dHMxcGxxYWRubGg1ZGQ2NTg2MSZlcD12MV9naWZzJmN0PWc/C1b76l9VM2nnKryWVn/giphy.gif",
    category: "Classic LGTM"
  },
  {
    id: "13",
    title: "Yes Yes Yes",
    url: "https://media2.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4a3hraWJiN3FtNDAyN2NmZWFmMTR5dHMxcGxxYWRubGg1ZGQ2NTg2MSZlcD12MV9naWZzJmN0PWc/dYZuqJLDVsWMLWyIxJ/giphy.gif",
    category: "Celebratory"
  },
  {
    id: "14",
    title: "Raise The Roof Office",
    url: "https://media3.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4a3hraWJiN3FtNDAyN2NmZWFmMTR5dHMxcGxxYWRubGg1ZGQ2NTg2MSZlcD12MV9naWZzJmN0PWc/lMVNl6XxTvXgs/giphy.gif",
    category: "Celebratory"
  },
  {
    id: "15",
    title: "Oh Yeah Ok",
    url: "https://media1.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4NW9xZzlwNHdwdzd0c2o1bjI5dWU1Yjc3bWZlMnBwa283c3lvNmwzYyZlcD12MV9naWZzJmN0PWc/i7Mtc0aWPTZyo/giphy.gif",
    category: "Classic LGTM"
  },
  {
    id: "16",
    title: "Seinfeld Thumb",
    url: "https://media0.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4a3hraWJiN3FtNDAyN2NmZWFmMTR5dHMxcGxxYWRubGg1ZGQ2NTg2MSZlcD12MV9naWZzJmN0PWc/Xhxd8T0og4oKs/giphy.gif",
    category: "Movies & TV"
  },
  {
    id: "17",
    title: "4 Thumbs",
    url: "https://media0.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4a3hraWJiN3FtNDAyN2NmZWFmMTR5dHMxcGxxYWRubGg1ZGQ2NTg2MSZlcD12MV9naWZzJmN0PWc/igVUGSVpEOjth5NVDd/giphy.gif",
    category: "Classic LGTM"
  },
  {
    id: "18",
    title: "Keanu Thumb",
    url: "https://media2.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4a3hraWJiN3FtNDAyN2NmZWFmMTR5dHMxcGxxYWRubGg1ZGQ2NTg2MSZlcD12MV9naWZzJmN0PWc/uiMIJMFYgRaAz5Pcb7/giphy.gif",
    category: "Movies & TV"
  },
  {
    id: "19",
    title: "Spongebob Patrick High Five",
    url: "https://media0.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4NW9xZzlwNHdwdzd0c2o1bjI5dWU1Yjc3bWZlMnBxa283c3lvNmwzYyZlcD12MV9naWZzJmN0PWc/3oEjHV0z8S7WM4MwnK/giphy.gif",
    category: "Celebratory"
  },
  {
    id: "20",
    title: "Horse Head Thumb",
    url: "https://media1.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4a3hraWJiN3FtNDAyN2NmZWFmMTR5dHMxcGxxYWRubGg1ZGQ2NTg2MSZlcD12MV9naWZzJmN0PWc/8RxCFgu88jUbe/giphy.gif",
    category: "Animals"
  },
  {
    id: "21",
    title: "Happy Colbert",
    url: "https://media0.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4a3hraWJiN3FtNDAyN2NmZWFmMTR5dHMxcGxxYWRubGg1ZGQ2NTg2MSZlcD12MV9naWZzJmN0PWc/WUq1cg9K7uzHa/giphy-downsized-medium.gif",
    category: "Movies & TV"
  },
  {
    id: "22",
    title: "BB8 Thumbs Up",
    url: "https://media2.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4a3hraWJiN3FtNDAyN2NmZWFmMTR5dHMxcGxxYWRubGg1ZGQ2NTg2MSZlcD12MV9naWZzJmN0PWc/2cRLQokbuIWB7YTGVt/giphy.gif",
    category: "Movies & TV"
  },
  {
    id: "23",
    title: "Yugi Thumb",
    url: "https://media2.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4a3hraWJiN3FtNDAyN2NmZWFmMTR5dHMxcGxxYWRubGg1ZGQ2NTg2MSZlcD12MV9naWZzJmN0PWc/YOyi3Olf68kjbEB3g9/giphy.gif",
    category: "Memes & Internet Culture"
  },
  {
    id: "24",
    title: "Captain Thumbs Up",
    url: "https://media2.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4NXNxOXBhYzJvd3dxcmtiOHhycGhzZGxhNGkwaG1hZDByOG9zbWIzZyZlcD12MV9naWZzJmN0PWc/cotGRE0bC4h8XJdqdM/giphy.gif",
    category: "Classic LGTM"
  },
  {
    id: "25",
    title: "Good Job Thumbs Up",
    url: "https://media2.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4NXNxOXBhYzJvd3dxcmtiOHhycGhzZGxhNGkwaG1hZDByOG9zbWIzZyZlcD12MV9naWZzJmN0PWc/JwjBy94VzDd6/giphy.gif",
    category: "Classic LGTM"
  },
  {
    id: "26",
    title: "LGTM Chef",
    url: "https://media4.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4NW9xZzlwNHdwdzd0c2o1bjI5dWU1Yjc3bWZlMnBxa283c3lvNmwzYyZlcD12MV9naWZzJmN0PWc/p9320y79bQPMzIygxv/giphy-downsized-medium.gif",
    category: "Classic LGTM"
  },
  {
    id: "27",
    title: "Stanley Thumb",
    url: "https://media0.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4a3hraWJiN3FtNDAyN2NmZWFmMTR5dHMxcGxxYWRubGg1ZGQ2NTg2MSZlcD12MV9naWZzJmN0PWc/VIjf1GqRSbf0OsNG0H/giphy.gif",
    category: "Movies & TV"
  },
  {
    id: "28",
    title: "Shaun The Sheep",
    url: "https://media2.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4NXNxOXBhYzJvd3dxcmtiOHhycGhzZGxhNGkwaG1hZDByOG9zbWIzZyZlcD12MV9naWZzJmN0PWc/tIeCLkB8geYtW/giphy.gif",
    category: "Animals"
  },
  {
    id: "29",
    title: "Jerry Ship It",
    url: "https://media4.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4NW9xZzlwNHdwdzd0c2o1bjI5dWU1Yjc3bWZlMnBxa283c3lvNmwzYyZlcD12MV9naWZzJmN0PWc/orJDyCGVTfetXKS7HT/giphy.gif",
    category: "Tech & Gaming"
  },
  {
    id: "30",
    title: "Banjo Thumb",
    url: "https://media0.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4NW9xZzlwNHdwdzd0c2o1bjI5dWU1Yjc3bWZlMnBxa283c3lvNmwzYyZlcD12MV9naWZzJmN0PWc/jsehWdAFnZ5Wlg3e7n/giphy.gif",
    category: "Memes & Internet Culture"
  },
  {
    id: "31",
    title: "Curry Dance",
    url: "https://media1.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4a3hraWJiN3FtNDAyN2NmZWFmMTR5dHMxcGxxYWRubGg1ZGQ2NTg2MSZlcD12MV9naWZzJmN0PWc/AJMPKDi4jV4me4FZ74/giphy.gif",
    category: "Sports"
  },
  {
    id: "32",
    title: "Obama Very Good",
    url: "https://media2.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4NXNxOXBhYzJvd3dxcmtiOHhycGhzZGxhNGkwaG1hZDByOG9zbWIzZyZlcD12MV9naWZzJmN0PWc/E6LPrrzKOJwhG/giphy.gif",
    category: "Classic LGTM"
  },
  {
    id: "33",
    title: "Dinesh Thumb",
    url: "https://media2.giphy.com/media/v1.Y2lkPTQ3MDI4ZmE4NW9xZzlwNHdwdzd0c2o1bjI5dWU1Yjc3bWZlMnBxa283c3lvNmwzYyZlcD12MV9naWZzJmN0PWc/0m8SXnvMnjIiAbrfv4/giphy.gif",
    category: "Tech & Gaming"
  }
];

export function getRandomLGTMGif(): LGTMGif {
  const randomIndex = Math.floor(Math.random() * LGTM_GIFS.length);
  return LGTM_GIFS[randomIndex];
}
