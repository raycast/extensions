import { Detail, getPreferenceValues } from '@raycast/api';
import { translateByDeepl } from './util/translate';

const preferences = getPreferenceValues();
export default () => {
  translateByDeepl(preferences.secondLanguage);
  return <Detail markdown="# translating..." />;
};
