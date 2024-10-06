import { describe, it, expect } from 'vitest';
import { getArguments,getNewArguments, replaceArgumentPlaceholders } from '../src/utils';
import { Arg } from '../src/datasource';


describe('getArguments', () => {
  it('should return an empty array when userInput is empty', () => {
    const result = getArguments('');
    expect(result).toEqual([]);
  });

  it('should return an empty array when there are no arguments in userInput', () => {
    const result = getArguments('echo Hello World');
    expect(result).toEqual([]);
  });

  it('should return an array of arguments when userInput contains arguments', () => {
    const result = getArguments('echo {{name}} {{age}}');
    expect(result).toEqual(['name', 'age']);
  });

  it('should trim spaces around arguments', () => {
    const result = getArguments('echo {{ name }} {{ age }}');
    expect(result).toEqual(['name', 'age']);
  });

  it('should ignore empty arguments', () => {
    const result = getArguments('echo {{}} {{name}}');
    expect(result).toEqual(['name']);
  });
});


describe('getNewArguments', () => {
  it('should return an empty array when newArgs is empty', () => {
    const result = getNewArguments([], [{ name: 'name', value: 'John' }]);
    expect(result).toEqual([]);
  });

  it('should return an empty array when oldArgObjs is empty', () => {
    const result = getNewArguments(['name'], []);
    expect(result).toEqual([{ name: 'name', value: '' }]);
  });

  it('should return new arguments when oldArgObjs is null', () => {
    const result = getNewArguments(['name'], null as any);
    expect(result).toEqual([{ name: 'name', value: '' }]);
  });

  it('should remove old arguments not in new arguments', () => {
    const result = getNewArguments(['name'], [{ name: 'age', value: '30' }]);
    expect(result).toEqual([{ name: 'name', value: '' }]);
  });

  it('should keep old arguments that are in new arguments', () => {
    const result = getNewArguments(['name'], [{ name: 'name', value: 'John' }]);
    expect(result).toEqual([{ name: 'name', value: 'John' }]);
  });

  it('should add new arguments that are not in old arguments', () => {
    const result = getNewArguments(['name', 'age'], [{ name: 'name', value: 'John' }]);
    expect(result).toEqual([{ name: 'name', value: 'John' }, { name: 'age', value: '' }]);
  });

  it('should trim spaces around new arguments', () => {
    const result = getNewArguments([' name ', ' age '], [{ name: 'name', value: 'John' }]);
    expect(result).toEqual([{ name: 'name', value: 'John' }, { name: 'age', value: '' }]);
  });

  it('should ignore empty new arguments', () => {
    const result = getNewArguments(['', 'name'], [{ name: 'age', value: '30' }]);
    expect(result).toEqual([{ name: 'name', value: '' }]);
  });
});

describe('replaceArgumentPlaceholders', () => {
  it('should replace arguments in the string', () => {
    const data = 'Hello {{name}}, you are {{age}} years old';
    const args = [
      { name: 'name', value: 'John' },
      { name: 'age', value: '30' }
    ];
    const result = replaceArgumentPlaceholders(data, args);
    expect(result).toBe('Hello John, you are 30 years old');
  });

  it('should not replace arguments that are not in the args array', () => {
    const data = 'Hello {{name}}, welcome to {{city}}';
    const args = [{ name: 'name', value: 'Alice' }];
    const result = replaceArgumentPlaceholders(data, args);
    expect(result).toBe('Hello Alice, welcome to {{city}}');
  });

  it('should handle empty args array', () => {
    const data = 'Hello {{name}}';
    const args: Arg[] = [];
    const result = replaceArgumentPlaceholders(data, args);
    expect(result).toBe('Hello {{name}}');
  });

  it('should handle multiple occurrences of the same argument', () => {
    const data = '{{greeting}} {{name}}! {{greeting}} again, {{name}}!';
    const args = [
      { name: 'greeting', value: 'Hello' },
      { name: 'name', value: 'Bob' }
    ];
    const result = replaceArgumentPlaceholders(data, args);
    expect(result).toBe('Hello Bob! Hello again, Bob!');
  });

  it('should return the original string if no arguments are present', () => {
    const data = 'This is a test string without arguments';
    const args: Arg[] = [];
    const result = replaceArgumentPlaceholders(data, args);
    expect(result).toBe(data);
  });

  it('should not replace arguments with empty value', () => {
    const data = 'Hello {{name}}, you are {{age}} years old';
    const args = [
      { name: 'name', value: 'John' },
      { name: 'age', value: '' }
    ];
    const result = replaceArgumentPlaceholders(data, args);
    expect(result).toBe('Hello John, you are {{age}} years old');
  });

  it('should handle arguments with surrounding spaces', () => {
    const data = 'Hello {{ name }}, you are {{  age  }} years old';
    const args = [
      { name: 'name', value: 'John' },
      { name: 'age', value: '30' }
    ];
    const result = replaceArgumentPlaceholders(data, args);
    expect(result).toBe('Hello John, you are 30 years old');
  });

  it('should handle arguments with mixed spacing', () => {
    const data = 'Welcome {{user}}, your ID is {{ id }} and role is {{  role  }}';
    const args = [
      { name: 'user', value: 'Alice' },
      { name: 'id', value: '12345' },
      { name: 'role', value: 'admin' }
    ];
    const result = replaceArgumentPlaceholders(data, args);
    expect(result).toBe('Welcome Alice, your ID is 12345 and role is admin');
  });
});
