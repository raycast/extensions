```fortran
subroutine zlarz (
        character side,
        integer m,
        integer n,
        integer l,
        complex*16, dimension( * ) v,
        integer incv,
        complex*16 tau,
        complex*16, dimension( ldc, * ) c,
        integer ldc,
        complex*16, dimension( * ) work
)
```

ZLARZ applies a complex elementary reflector H to a complex
M-by-N matrix C, from either the left or the right. H is represented
in the form

H = I - tau \* v \* v\*\*H

where tau is a complex scalar and v is a complex vector.

If tau = 0, then H is taken to be the unit matrix.

To apply H\*\*H (the conjugate transpose of H), supply conjg(tau) instead
tau.

H is a product of k elementary reflectors as returned by ZTZRZF.

## Parameters
SIDE : CHARACTER\*1 [in]
> = 'L': form  H \* C
> = 'R': form  C \* H

M : INTEGER [in]
> The number of rows of the matrix C.

N : INTEGER [in]
> The number of columns of the matrix C.

L : INTEGER [in]
> The number of entries of the vector V containing
> the meaningful part of the Householder vectors.
> If SIDE = 'L', M >= L >= 0, if SIDE = 'R', N >= L >= 0.

V : COMPLEX\*16 array, dimension (1+(L-1)\*abs(INCV)) [in]
> The vector v in the representation of H as returned by
> ZTZRZF. V is not used if TAU = 0.

INCV : INTEGER [in]
> The increment between elements of v. INCV <> 0.

TAU : COMPLEX\*16 [in]
> The value tau in the representation of H.

C : COMPLEX\*16 array, dimension (LDC,N) [in,out]
> On entry, the M-by-N matrix C.
> On exit, C is overwritten by the matrix H \* C if SIDE = 'L',
> or C \* H if SIDE = 'R'.

LDC : INTEGER [in]
> The leading dimension of the array C. LDC >= max(1,M).

WORK : COMPLEX\*16 array, dimension [out]
> (N) if SIDE = 'L'
> or (M) if SIDE = 'R'
