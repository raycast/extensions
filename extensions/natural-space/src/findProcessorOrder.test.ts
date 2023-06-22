import { findProcessorOrder } from './findProcessorOrder';
import { processorOrder } from './processorOrder';
import { processors } from './processors';

const noop = () => '';
const echo = (x: string) => (acc: string) => acc + x;

describe('Find processor order', () => {
  it('should find processor order', () => {
    expect(
      findProcessorOrder([
        ['a', echo('a'), ['b']],
        ['b', echo('b'), ['c']],
        ['c', echo('c')],
      ])
    ).toEqual(['c', 'b', 'a']);
  });

  it('should handle more complex cases', () => {
    expect(
      findProcessorOrder([
        ['a1', noop, ['b1', 'b2']],
        ['a2', noop, ['b1', 'b2']],
        ['b1', noop],
        ['b2', noop],
      ])
    ).toEqual(['b1', 'b2', 'a1', 'a2']);
  });

  it('should detect loop', () => {
    expect(() =>
      findProcessorOrder([
        ['a', noop, ['b']],
        ['b', noop, ['c']],
        ['c', noop, ['a']],
      ])
    ).toThrowError();
  });

  it('should detect duplicate', () => {
    expect(() =>
      findProcessorOrder([
        ['a', noop, ['b']],
        ['b', noop, ['c']],
        ['c', noop],
        ['a', noop, ['b']],
      ])
    ).toThrowError();
  });

  it('should detect missing dependency', () => {
    expect(() =>
      findProcessorOrder([
        ['a', noop, ['b']],
        ['b', noop, ['c']],
        ['c', noop],
        ['d', noop, ['e']],
      ])
    ).toThrowError();
  });

  it('should output the order of processors', () => {
    expect(findProcessorOrder(processors)).toEqual(processorOrder);
  });
});
