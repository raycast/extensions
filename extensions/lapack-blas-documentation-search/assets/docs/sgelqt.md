```fortran
subroutine sgelqt (
        integer m,
        integer n,
        integer mb,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( ldt, * ) t,
        integer ldt,
        real, dimension( * ) work,
        integer info
)
```

SGELQT computes a blocked LQ factorization of a real M-by-N matrix A
using the compact WY representation of Q.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A.  N >= 0.

MB : INTEGER [in]
> The block size to be used in the blocked QR.  MIN(M,N) >= MB >= 1.

A : REAL array, dimension (LDA,N) [in,out]
> On entry, the M-by-N matrix A.
> On exit, the elements on and below the diagonal of the array
> contain the M-by-MIN(M,N) lower trapezoidal matrix L (L is
> lower triangular if M <= N); the elements above the diagonal
> are the rows of V.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

T : REAL array, dimension (LDT,MIN(M,N)) [out]
> The upper triangular block reflectors stored in compact form
> as a sequence of upper triangular blocks.  See below
> for further details.

LDT : INTEGER [in]
> The leading dimension of the array T.  LDT >= MB.

WORK : REAL array, dimension (MB\*N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
