import { createClient } from '@youri-kane/heroku-client';
import getPreferences from './preferences'

export default createClient({
    token: getPreferences().apiKey
});