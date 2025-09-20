import { describe, it, expect } from 'vitest';
import { commandFilter } from '../src/filter';

describe('commandFilter', () => {
  it('should return false if data is empty', () => {
    const item = { data: '', remark: 'some remark' };
    expect(commandFilter(item, '')).toBe(false);
    expect(commandFilter(item, 'keyword')).toBe(false);
  });

  it('should return true if keyword is empty', () => {
    const item = { data: 'some data', remark: 'some remark' };
    expect(commandFilter(item, '')).toBe(true);
  });

  it('should return true if keyword is found in data or remark', () => {
    const item = { data: 'some data', remark: 'some remark' };
    expect(commandFilter(item, 'some')).toBe(true);
    expect(commandFilter(item, 'data')).toBe(true);
    expect(commandFilter(item, 'remark')).toBe(true);
  });

  it('should return false if keyword is not found in data or remark', () => {
    const item = { data: 'some data', remark: 'some remark' };
    expect(commandFilter(item, 'notfound')).toBe(false);
  });

  it('should handle keywords with spaces correctly', () => {
    const item = { data: 'some data', remark: 'some remark' };
    expect(commandFilter(item, 'some data')).toBe(true);
    expect(commandFilter(item, '    some  data    ')).toBe(true);
    expect(commandFilter(item, 'data some')).toBe(true);
    expect(commandFilter(item, 'some remark')).toBe(true);
    expect(commandFilter(item, '  some  remark  ')).toBe(true);
    expect(commandFilter(item, 'remark some')).toBe(true);
    expect(commandFilter(item, 'data remark')).toBe(false);
    expect(commandFilter(item, 'not found')).toBe(false);
  });

  it('should handle pinyin conversion correctly', () => {
    const item = { data: '测试数据', remark: '测试备注' };
    expect(commandFilter(item, 'ceshi')).toBe(true);
    expect(commandFilter(item, 'shuju')).toBe(true);
    expect(commandFilter(item, 'beizhu')).toBe(true);
    expect(commandFilter(item, 'notfound')).toBe(false);
  });

  it('should handle pinyin first character correctly', () => {
    const item = { data: '测试数据', remark: '测试备注' };
    expect(commandFilter(item, 'cs')).toBe(true);
    expect(commandFilter(item, 'sj')).toBe(true);
    expect(commandFilter(item, 'bz')).toBe(true);
    expect(commandFilter(item, 'nf')).toBe(false);
  });
  
  it('should return true if keyword is found in Chinese data or remark', () => {
    const item = { data: '测试数据', remark: '测试备注' };
    expect(commandFilter(item, '测试')).toBe(true);
    expect(commandFilter(item, '数据')).toBe(true);
    expect(commandFilter(item, '备注')).toBe(true);
  });

  it('should return false if keyword is not found in Chinese data or remark', () => {
    const item = { data: '测试数据', remark: '测试备注' };
    expect(commandFilter(item, '不存在')).toBe(false);
  });

  it('should handle mixed Chinese and English keywords correctly', () => {
    const item = { data: '测试数据test', remark: 'test remark 测试备注' };
    expect(commandFilter(item, '测试 test')).toBe(true);
    expect(commandFilter(item, '数据 test')).toBe(true);
    expect(commandFilter(item, '备注 remark')).toBe(true);
    expect(commandFilter(item, 'test 测试')).toBe(true);
    expect(commandFilter(item, 'test 数据')).toBe(true);
    expect(commandFilter(item, 'test 备注')).toBe(true);
    expect(commandFilter(item, '不存在 test')).toBe(false);
  });

  it('should return true only if all space-separated keywords are found', () => {
    const item = { data: 'some data', remark: 'some remark' };
    expect(commandFilter(item, 'some data')).toBe(true);
    expect(commandFilter(item, 'some remark')).toBe(true);
    expect(commandFilter(item, 'some data remark')).toBe(false);
    expect(commandFilter(item, 'some data notfound')).toBe(false);
    expect(commandFilter(item, 'data remark')).toBe(false);
    expect(commandFilter(item, 'data notfound')).toBe(false);
    expect(commandFilter(item, 'remark notfound')).toBe(false);
  });

});
