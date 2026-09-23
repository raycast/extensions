import assert from 'node:assert/strict';
import { categoryTitle, setLanguage, t } from '../src/i18n.ts';
setLanguage('en');
assert.equal(t`书签 ${3}`, 'Bookmarks: 3');
assert.equal(categoryTitle('g-default', '默认'), 'Default');
assert.equal(categoryTitle('custom', '默认'), '默认');
setLanguage('zh-Hans');
assert.equal(t`书签 ${3}`, '书签 3');
assert.equal(categoryTitle('g-default', '默认'), '默认');
