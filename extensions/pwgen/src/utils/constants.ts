export const ENTROPY_PER_LEVEL = 32
export const ASCII_CHARACTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const NUMBERS = '0123456789'

// Less entropy means a horrible password
export const STRENGTH_HORRIBLE = 32
// Less entropy means a weak password
export const STRENGTH_WEAK = 64
// More entropy means a strong password
export const STRENGTH_STRONG = 96
