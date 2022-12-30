export const errInfosSamples = [
  {
    text: "하잉",
    errInfos: [
      {
        errorIdx: 0,
        orgStr: "하잉",
        help: ``,
        start: 0,
        end: 2,
        candWords: ["항이", "하일", "하인"],
      },
    ],
  },

  {
    text: "문자보내다가 띄어쓰기헷갈릴때",
    errInfos: [
      {
        errorIdx: 0,
        orgStr: "문자보내다가",
        help: "",
        start: 0,
        end: 6,
        candWords: ["문자 보내다가"],
      },
      {
        errorIdx: 1,
        orgStr: "띄어쓰기헷갈릴때",
        help: ``,
        start: 7,
        end: 15,
        candWords: ["띄어쓰기 헷갈릴 때"],
      },
    ],
  },

  {
    text: "흔들리지 않고 피는 꽃이 어디 있으랴이 세상 그 어떤 아름다운 꽃들도다 흔들리면서 피었나니",
    errInfos: [
      {
        help: "",
        errorIdx: 0,
        start: 17,
        end: 21,
        orgStr: "있으랴이",
        candWords: ["있겠느냐"],
      },
      {
        help: "",
        errorIdx: 1,
        start: 35,
        end: 39,
        orgStr: "꽃들도다",
        candWords: ["꽃들도 다", "꽃들보다", "꽃들도 그렇다"],
      },
      {
        help: "",
        errorIdx: 2,
        start: 46,
        end: 50,
        orgStr: "피었나니",
        candWords: ["폈느냐니"],
      },
    ],
  },
  {
    text: "음...안녕하세요. 반가와요. 잘부탁드려요",
    errInfos: [
      {
        help: "",
        errorIdx: 0,
        start: 0,
        end: 9,
        orgStr: "음...안녕하세요",
        candWords: ["음…. 안녕하세요", "음. 안녕하세요"],
      },
      {
        help: "",
        errorIdx: 1,
        start: 11,
        end: 15,
        orgStr: "반가와요",
        candWords: ["반가워요"],
      },
      {
        help: "",
        errorIdx: 2,
        start: 17,
        end: 23,
        orgStr: "잘부탁드려요",
        candWords: ["잘 부탁드려요"],
      },
    ],
  },
];
