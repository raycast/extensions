import { SearchType } from './type'

export const SearchTypeText = {
  [SearchType.All]: '全部',
  [SearchType.Podcast]: '节目',
  [SearchType.Episode]: '单集',
  [SearchType.User]: '用户',
}

export const SearchDropdownOrders = [
  SearchType.All,
  SearchType.Podcast,
  SearchType.Episode,
  SearchType.User,
]
