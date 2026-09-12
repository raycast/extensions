```fortran
subroutine zlarf1f (
        character side,
        integer m,
        integer n,
        complex*16, dimension( * ) v,
        integer incv,
        complex*16 tau,
        complex*16, dimension( ldc, * ) c,
        integer ldc,
        complex*16, dimension( * ) work
)
```

ZLARF1F applies a complex elementary reflector H to a real m by n matrix
C, from either the left or the right. H is represented in the form

H = I - tau \* v \* v\*\*H

where tau is a complex scalar and v is a complex vector.

If tau = 0, then H is taken to be the unit matrix.

To apply H\*\*H, supply conjg(tau) instead
tau.

## Parameters
SIDE : CHARACTER\*1 [in]
> = 'L': form  H \* C
> 
> \param[in] M
> \verbatim
> M is INTEGER
> The number of rows of the matrix C.

N : INTEGER [in]
> The number of columns of the matrix C.

V : COMPLEX\*16 array, dimension [in]
> (1 + (M-1)\*abs(INCV)) if SIDE = 'L'
> or (1 + (N-1)\*abs(INCV)) if SIDE = 'R'
> The vector v in the representation of H. V is not used if
> TAU = 0. V(1) is not referenced or modified.

INCV : INTEGER [in]
> The increment between elements of v. INCV <> 0.

TAU : COMPLEX\*16 [in]
> The value tau in the representation of H.

C : COMPLEX\*16 array, dimension (LDC,N) [in,out]
> On entry, the m by n matrix C.
> On exit, C is overwritten by the matrix H \* C if SIDE = 'L',
> or C \* H if SIDE = 'R'.

LDC : INTEGER [in]
> The leading dimension of the array C. LDC >= max(1,M).

WORK : COMPLEX\*16 array, dimension [out]
> (N) if SIDE = 'L'
> or (M) if SIDE = 'R'
