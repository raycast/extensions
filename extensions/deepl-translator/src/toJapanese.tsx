import { Detail } from '@raycast/api';
import { translateByDeepl } from './util/translate';

export default () => {
  translateByDeepl('JA');
  return <Detail markdown="# translating..." />;
};
