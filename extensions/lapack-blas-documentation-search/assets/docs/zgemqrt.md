```fortran
subroutine zgemqrt (
        character side,
        character trans,
        integer m,
        integer n,
        integer k,
        integer nb,
        complex*16, dimension( ldv, * ) v,
        integer ldv,
        complex*16, dimension( ldt, * ) t,
        integer ldt,
        complex*16, dimension( ldc, * ) c,
        integer ldc,
        complex*16, dimension( * ) work,
        integer info
)
```

ZGEMQRT overwrites the general complex M-by-N matrix C with

SIDE = 'L'     SIDE = 'R'
TRANS = 'N':      Q C            C Q
TRANS = 'C':    Q\*\*H C            C Q\*\*H

where Q is a complex orthogonal matrix defined as the product of K
elementary reflectors:

Q = H(1) H(2) . . . H(K) = I - V T V\*\*H

generated using the compact WY representation as returned by ZGEQRT.

Q is of order M if SIDE = 'L' and of order N  if SIDE = 'R'.

## Parameters
SIDE : CHARACTER\*1 [in]
> = 'L': apply Q or Q\*\*H from the Left;
> = 'R': apply Q or Q\*\*H from the Right.

TRANS : CHARACTER\*1 [in]
> = 'N':  No transpose, apply Q;
> = 'C':  Conjugate transpose, apply Q\*\*H.

M : INTEGER [in]
> The number of rows of the matrix C. M >= 0.

N : INTEGER [in]
> The number of columns of the matrix C. N >= 0.

K : INTEGER [in]
> The number of elementary reflectors whose product defines
> the matrix Q.
> If SIDE = 'L', M >= K >= 0;
> if SIDE = 'R', N >= K >= 0.

NB : INTEGER [in]
> The block size used for the storage of T.  K >= NB >= 1.
> This must be the same value of NB used to generate T
> in ZGEQRT.

V : COMPLEX\*16 array, dimension (LDV,K) [in]
> The i-th column must contain the vector which defines the
> elementary reflector H(i), for i = 1,2,...,k, as returned by
> ZGEQRT in the first K columns of its array argument A.

LDV : INTEGER [in]
> The leading dimension of the array V.
> If SIDE = 'L', LDA >= max(1,M);
> if SIDE = 'R', LDA >= max(1,N).

T : COMPLEX\*16 array, dimension (LDT,K) [in]
> The upper triangular factors of the block reflectors
> as returned by ZGEQRT, stored as a NB-by-N matrix.

LDT : INTEGER [in]
> The leading dimension of the array T.  LDT >= NB.

C : COMPLEX\*16 array, dimension (LDC,N) [in,out]
> On entry, the M-by-N matrix C.
> On exit, C is overwritten by Q C, Q\*\*H C, C Q\*\*H or C Q.

LDC : INTEGER [in]
> The leading dimension of the array C. LDC >= max(1,M).

WORK : COMPLEX\*16 array. The dimension of WORK is [out]
> N\*NB if SIDE = 'L', or  M\*NB if SIDE = 'R'.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
