import {
  convertDurationsToSeconds,
  validateDuration,
} from '../src/composables/ValidateDuration'

describe('validateDuration', () => {
  it('should reject undefined', () => {
    expect(validateDuration(undefined)).toBe('Please enter duration')
  })
  it('should reject empty string', () => {
    expect(validateDuration('')).toBe('Please enter duration')
  })
  it('should accept minutes', () => {
    expect(validateDuration('1m')).toBeUndefined()
    expect(validateDuration('30m')).toBeUndefined()
    expect(validateDuration('59m')).toBeUndefined()
  })
  it('should reject invalid minutes', () => {
    expect(validateDuration('m')).toBe('Please enter valid duration')
    expect(validateDuration('0m')).toBe('Please enter valid duration')
    expect(validateDuration('60m')).toBe('Please enter valid duration')
  })
  it('should accept hours', () => {
    expect(validateDuration('1h')).toBeUndefined()
    expect(validateDuration('20h')).toBeUndefined()
  })
  it('should reject invalid hours', () => {
    expect(validateDuration('h')).toBe('Please enter valid duration')
    expect(validateDuration('0h')).toBe('Please enter valid duration')
  })
  it('should accept hours and minutes', () => {
    expect(validateDuration('1h 1m')).toBeUndefined()
    expect(validateDuration('1h 30m')).toBeUndefined()
    expect(validateDuration('1h 59m')).toBeUndefined()
    expect(validateDuration('20h 1m')).toBeUndefined()
    expect(validateDuration('20h 30m')).toBeUndefined()
    expect(validateDuration('20h 59m')).toBeUndefined()
  })
  it('should reject invalid hours and minutes', () => {
    expect(validateDuration('h m')).toBe('Please enter valid duration')
    expect(validateDuration('h 60m')).toBe('Please enter valid duration')
    expect(validateDuration('0h m')).toBe('Please enter valid duration')
    expect(validateDuration('0h 60m')).toBe('Please enter valid duration')
  })
  it('should accept hh:mm', () => {
    expect(validateDuration('0:01')).toBeUndefined()
    expect(validateDuration('0:10')).toBeUndefined()
    expect(validateDuration('0:59')).toBeUndefined()
    expect(validateDuration('1:00')).toBeUndefined()
    expect(validateDuration('1:10')).toBeUndefined()
    expect(validateDuration('1:59')).toBeUndefined()
  })
  it('should reject invalid hh:mm', () => {
    expect(validateDuration(':')).toBe('Please enter valid duration')
    expect(validateDuration(':10')).toBe('Please enter valid duration')
    expect(validateDuration('1:')).toBe('Please enter valid duration')
    expect(validateDuration('0:5')).toBe('Please enter valid duration')
    expect(validateDuration('0:00')).toBe('Please enter valid duration')
  })
  it('should accept x,xxh', () => {
    expect(validateDuration('0,1')).toBeUndefined()
    expect(validateDuration('0,5')).toBeUndefined()
    expect(validateDuration(' ,5')).toBeUndefined()
    expect(validateDuration('1,0')).toBeUndefined()
    expect(validateDuration('1,5')).toBeUndefined()
    expect(validateDuration('0.1')).toBeUndefined()
    expect(validateDuration('0.5')).toBeUndefined()
    expect(validateDuration(' .7')).toBeUndefined()
    expect(validateDuration('1.0')).toBeUndefined()
    expect(validateDuration('1.5')).toBeUndefined()
  })
  it('should reject invalid x,xxh', () => {
    expect(validateDuration(',')).toBe('Please enter valid duration')
    expect(validateDuration('1,')).toBe('Please enter valid duration')
    expect(validateDuration('0,0')).toBe('Please enter valid duration')
    expect(validateDuration('.')).toBe('Please enter valid duration')
    expect(validateDuration('2.')).toBe('Please enter valid duration')
    expect(validateDuration('0.0')).toBe('Please enter valid duration')
  })
})

describe('convertDurationsToSeconds', () => {
  it('should convert minutes to seconds', () => {
    expect(convertDurationsToSeconds('5m')).toBe(300)
    expect(convertDurationsToSeconds('30m')).toBe(1800)
  })
  it('should convert hours to seconds', () => {
    expect(convertDurationsToSeconds('1h')).toBe(3600)
    expect(convertDurationsToSeconds('5h')).toBe(18000)
  })
  it('should convert hours and minutes to seconds', () => {
    expect(convertDurationsToSeconds('1h 5m')).toBe(3900)
    expect(convertDurationsToSeconds('1h 30m')).toBe(5400)
    expect(convertDurationsToSeconds('5h 5m')).toBe(18300)
    expect(convertDurationsToSeconds('5h 30m')).toBe(19800)
  })
  it('should convert hh:mm to seconds', () => {
    expect(convertDurationsToSeconds('0:15')).toBe(900)
    expect(convertDurationsToSeconds('0:45')).toBe(2700)
    expect(convertDurationsToSeconds('1:00')).toBe(3600)
    expect(convertDurationsToSeconds('2:45')).toBe(9900)
  })
  it('should convert x,xxh to seconds', () => {
    expect(convertDurationsToSeconds('0,5')).toBeCloseTo(1800)
    expect(convertDurationsToSeconds('0,05')).toBeCloseTo(180)
    expect(convertDurationsToSeconds(',75')).toBeCloseTo(2700)
    expect(convertDurationsToSeconds('3,0')).toBeCloseTo(10800)
    expect(convertDurationsToSeconds('5,5')).toBeCloseTo(19800)
    expect(convertDurationsToSeconds('0.5')).toBeCloseTo(1800)
    expect(convertDurationsToSeconds('0.05')).toBeCloseTo(180)
    expect(convertDurationsToSeconds('.75')).toBeCloseTo(2700)
    expect(convertDurationsToSeconds('3.0')).toBeCloseTo(10800)
    expect(convertDurationsToSeconds('5.5')).toBeCloseTo(19800)
    expect(convertDurationsToSeconds('0,5h')).toBeCloseTo(1800)
    expect(convertDurationsToSeconds('0,05h')).toBeCloseTo(180)
    expect(convertDurationsToSeconds(',75h')).toBeCloseTo(2700)
    expect(convertDurationsToSeconds('3,0h')).toBeCloseTo(10800)
    expect(convertDurationsToSeconds('5,5h')).toBeCloseTo(19800)
    expect(convertDurationsToSeconds('0.5h')).toBeCloseTo(1800)
    expect(convertDurationsToSeconds('0.05h')).toBeCloseTo(180)
    expect(convertDurationsToSeconds('.75h')).toBeCloseTo(2700)
    expect(convertDurationsToSeconds('3.0h')).toBeCloseTo(10800)
    expect(convertDurationsToSeconds('5.5h')).toBeCloseTo(19800)
  })
})
