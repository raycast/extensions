```fortran
subroutine sgemqrt (
        character side,
        character trans,
        integer m,
        integer n,
        integer k,
        integer nb,
        real, dimension( ldv, * ) v,
        integer ldv,
        real, dimension( ldt, * ) t,
        integer ldt,
        real, dimension( ldc, * ) c,
        integer ldc,
        real, dimension( * ) work,
        integer info
)
```

SGEMQRT overwrites the general real M-by-N matrix C with

SIDE = 'L'     SIDE = 'R'
TRANS = 'N':      Q C            C Q
TRANS = 'T':   Q\*\*T C            C Q\*\*T

where Q is a real orthogonal matrix defined as the product of K
elementary reflectors:

Q = H(1) H(2) . . . H(K) = I - V T V\*\*T

generated using the compact WY representation as returned by SGEQRT.

Q is of order M if SIDE = 'L' and of order N  if SIDE = 'R'.

## Parameters
SIDE : CHARACTER\*1 [in]
> = 'L': apply Q or Q\*\*T from the Left;
> = 'R': apply Q or Q\*\*T from the Right.

TRANS : CHARACTER\*1 [in]
> = 'N':  No transpose, apply Q;
> = 'T':  Transpose, apply Q\*\*T.

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
> in SGEQRT.

V : REAL array, dimension (LDV,K) [in]
> The i-th column must contain the vector which defines the
> elementary reflector H(i), for i = 1,2,...,k, as returned by
> SGEQRT in the first K columns of its array argument A.

LDV : INTEGER [in]
> The leading dimension of the array V.
> If SIDE = 'L', LDA >= max(1,M);
> if SIDE = 'R', LDA >= max(1,N).

T : REAL array, dimension (LDT,K) [in]
> The upper triangular factors of the block reflectors
> as returned by SGEQRT, stored as a NB-by-N matrix.

LDT : INTEGER [in]
> The leading dimension of the array T.  LDT >= NB.

C : REAL array, dimension (LDC,N) [in,out]
> On entry, the M-by-N matrix C.
> On exit, C is overwritten by Q C, Q\*\*T C, C Q\*\*T or C Q.

LDC : INTEGER [in]
> The leading dimension of the array C. LDC >= max(1,M).

WORK : REAL array. The dimension of WORK is [out]
> N\*NB if SIDE = 'L', or  M\*NB if SIDE = 'R'.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
