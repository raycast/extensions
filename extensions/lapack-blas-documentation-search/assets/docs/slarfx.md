```fortran
subroutine slarfx (
        character side,
        integer m,
        integer n,
        real, dimension( * ) v,
        real tau,
        real, dimension( ldc, * ) c,
        integer ldc,
        real, dimension( * ) work
)
```

SLARFX applies a real elementary reflector H to a real m by n
matrix C, from either the left or the right. H is represented in the
form

H = I - tau \* v \* v\*\*T

where tau is a real scalar and v is a real vector.

If tau = 0, then H is taken to be the unit matrix

This version uses inline code if H has order < 11.

## Parameters
SIDE : CHARACTER\*1 [in]
> = 'L': form  H \* C
> = 'R': form  C \* H

M : INTEGER [in]
> The number of rows of the matrix C.

N : INTEGER [in]
> The number of columns of the matrix C.

V : REAL array, dimension (M) if SIDE = 'L' [in]
> or (N) if SIDE = 'R'
> The vector v in the representation of H.

TAU : REAL [in]
> The value tau in the representation of H.

C : REAL array, dimension (LDC,N) [in,out]
> On entry, the m by n matrix C.
> On exit, C is overwritten by the matrix H \* C if SIDE = 'L',
> or C \* H if SIDE = 'R'.

LDC : INTEGER [in]
> The leading dimension of the array C. LDC >= (1,M).

WORK : REAL array, dimension [out]
> (N) if SIDE = 'L'
> or (M) if SIDE = 'R'
> WORK is not referenced if H has order < 11.
