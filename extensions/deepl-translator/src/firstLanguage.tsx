import { Detail, getPreferenceValues } from '@raycast/api';
import { translateByDeepl } from './util/translate';

const preferences = getPreferenceValues();
export default () => {
  translateByDeepl(preferences.firstLanguage);
  return <Detail markdown="# translating..." />;
};
