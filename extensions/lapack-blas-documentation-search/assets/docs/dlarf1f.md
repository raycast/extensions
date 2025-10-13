```fortran
subroutine dlarf1f (
        character side,
        integer m,
        integer n,
        double precision, dimension( * ) v,
        integer incv,
        double precision tau,
        double precision, dimension( ldc, * ) c,
        integer ldc,
        double precision, dimension( * ) work
)
```

DLARF1F applies a real elementary reflector H to a real m by n matrix
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

V : DOUBLE PRECISION array, dimension [in]
> (1 + (M-1)\*abs(INCV)) if SIDE = 'L'
> or (1 + (N-1)\*abs(INCV)) if SIDE = 'R'
> The vector v in the representation of H. V is not used if
> TAU = 0. V(1) is not referenced or modified.

INCV : INTEGER [in]
> The increment between elements of v. INCV <> 0.

TAU : DOUBLE PRECISION [in]
> The value tau in the representation of H.

C : DOUBLE PRECISION array, dimension (LDC,N) [in,out]
> On entry, the m by n matrix C.
> On exit, C is overwritten by the matrix H \* C if SIDE = 'L',
> or C \* H if SIDE = 'R'.

LDC : INTEGER [in]
> The leading dimension of the array C. LDC >= max(1,M).

WORK : DOUBLE PRECISION array, dimension [out]
> (N) if SIDE = 'L'
> or (M) if SIDE = 'R'
