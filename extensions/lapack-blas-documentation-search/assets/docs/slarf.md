```fortran
subroutine slarf (
        character side,
        integer m,
        integer n,
        real, dimension( * ) v,
        integer incv,
        real tau,
        real, dimension( ldc, * ) c,
        integer ldc,
        real, dimension( * ) work
)
```

SLARF applies a real elementary reflector H to a real m by n matrix
C, from either the left or the right. H is represented in the form

H = I - tau \* v \* v\*\*T

where tau is a real scalar and v is a real vector.

If tau = 0, then H is taken to be the unit matrix.

## Parameters
SIDE : CHARACTER\*1 [in]
> = 'L': form  H \* C
> = 'R': form  C \* H

M : INTEGER [in]
> The number of rows of the matrix C.

N : INTEGER [in]
> The number of columns of the matrix C.

V : REAL array, dimension [in]
> (1 + (M-1)\*abs(INCV)) if SIDE = 'L'
> or (1 + (N-1)\*abs(INCV)) if SIDE = 'R'
> The vector v in the representation of H. V is not used if
> TAU = 0.

INCV : INTEGER [in]
> The increment between elements of v. INCV <> 0.

TAU : REAL [in]
> The value tau in the representation of H.

C : REAL array, dimension (LDC,N) [in,out]
> On entry, the m by n matrix C.
> On exit, C is overwritten by the matrix H \* C if SIDE = 'L',
> or C \* H if SIDE = 'R'.

LDC : INTEGER [in]
> The leading dimension of the array C. LDC >= max(1,M).

WORK : REAL array, dimension [out]
> (N) if SIDE = 'L'
> or (M) if SIDE = 'R'
