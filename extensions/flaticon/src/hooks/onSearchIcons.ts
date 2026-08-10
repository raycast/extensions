import { useCachedPromise } from '@raycast/utils';
import { Token } from '../entities/Token';
import { searchIcons } from '../flows/searchIcons';

export default (token: Token, search = '') => {
  const { isLoading, data } = useCachedPromise(searchIcons, [token, search]);

  return { isLoading, data };
};
