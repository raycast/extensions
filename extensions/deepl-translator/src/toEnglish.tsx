import { Detail } from '@raycast/api';
import { translateByDeepl } from './util/translate';

export default () => {
  translateByDeepl('EN');
  return <Detail markdown="# translating..." />;
};
