export interface IGame {

  // 游戏唯一id
  appid: string

  // 英文名称
  title: string

  // 中文名称
  titleZh: string

  // 折扣，off表示
  cutoff: number

  // 离折扣结束剩余天数
  leftDiscount: string
  country: string
  discountEnd: number
  gameId: number
  icon: string
  lowestPrice: number
  price: number
  priceRaw: number
  rate: number
  recommendLabel: string
  recommendLevel: number
  saleStatus: number
  type: number
}

export interface IGameInfo {
  appid: string
  banner: string
  brief: string
  category: string[]
  // 是否支持中文，1 = 支持 | 0 = 不支持
  chineseVer: 1 | 0
  // 全区是否支持中文
  chinese_all: 1 | 0
  coinName: string
  commentNum: number
  country: string
  countryZone: string[]
  cutoff: number
  demo: number
  detail: string
}

export interface IPrice {
  // 地区
  country: string

  // 折扣，off表示
  cutoff: number

  // 折扣结束日期
  discountEnd: string

  // 离折扣结束剩余天数
  leftDiscount: string

  // 原价
  originPrice: number

  // 当前价格
  price: number
}

export interface INews {
  id: number
  time: string
  date: string
  title: {
    rendered: string
  }
  content?: {
    rendered: string
  }
  link: string
}
