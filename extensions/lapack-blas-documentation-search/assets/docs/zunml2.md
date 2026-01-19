```fortran
subroutine zunml2 (
        character side,
        character trans,
        integer m,
        integer n,
        integer k,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex*16, dimension( * ) tau,
        complex*16, dimension( ldc, * ) c,
        integer ldc,
        complex*16, dimension( * ) work,
        integer info
)
```

ZUNML2 overwrites the general complex m-by-n matrix C with

Q \* C  if SIDE = 'L' and TRANS = 'N', or

Q\*\*H\* C  if SIDE = 'L' and TRANS = 'C', or

C \* Q  if SIDE = 'R' and TRANS = 'N', or

C \* Q\*\*H if SIDE = 'R' and TRANS = 'C',

where Q is a complex unitary matrix defined as the product of k
elementary reflectors

Q = H(k)\*\*H . . . H(2)\*\*H H(1)\*\*H

as returned by ZGELQF. Q is of order m if SIDE = 'L' and of order n
if SIDE = 'R'.

## Parameters
SIDE : CHARACTER\*1 [in]
> = 'L': apply Q or Q\*\*H from the Left
> = 'R': apply Q or Q\*\*H from the Right

TRANS : CHARACTER\*1 [in]
> = 'N': apply Q  (No transpose)
> = 'C': apply Q\*\*H (Conjugate transpose)

M : INTEGER [in]
> The number of rows of the matrix C. M >= 0.

N : INTEGER [in]
> The number of columns of the matrix C. N >= 0.

K : INTEGER [in]
> The number of elementary reflectors whose product defines
> the matrix Q.
> If SIDE = 'L', M >= K >= 0;
> if SIDE = 'R', N >= K >= 0.

A : COMPLEX\*16 array, dimension [in]
> (LDA,M) if SIDE = 'L',
> (LDA,N) if SIDE = 'R'
> The i-th row must contain the vector which defines the
> elementary reflector H(i), for i = 1,2,...,k, as returned by
> ZGELQF in the first k rows of its array argument A.
> A is modified by the routine but restored on exit.

LDA : INTEGER [in]
> The leading dimension of the array A. LDA >= max(1,K).

TAU : COMPLEX\*16 array, dimension (K) [in]
> TAU(i) must contain the scalar factor of the elementary
> reflector H(i), as returned by ZGELQF.

C : COMPLEX\*16 array, dimension (LDC,N) [in,out]
> On entry, the m-by-n matrix C.
> On exit, C is overwritten by Q\*C or Q\*\*H\*C or C\*Q\*\*H or C\*Q.

LDC : INTEGER [in]
> The leading dimension of the array C. LDC >= max(1,M).

WORK : COMPLEX\*16 array, dimension [out]
> (N) if SIDE = 'L',
> (M) if SIDE = 'R'

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
