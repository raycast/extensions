```fortran
subroutine dgelqt (
        integer m,
        integer n,
        integer mb,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( ldt, * ) t,
        integer ldt,
        double precision, dimension( * ) work,
        integer info
)
```

DGELQT computes a blocked LQ factorization of a real M-by-N matrix A
using the compact WY representation of Q.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A.  N >= 0.

MB : INTEGER [in]
> The block size to be used in the blocked QR.  MIN(M,N) >= MB >= 1.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> On entry, the M-by-N matrix A.
> On exit, the elements on and below the diagonal of the array
> contain the M-by-MIN(M,N) lower trapezoidal matrix L (L is
> lower triangular if M <= N); the elements above the diagonal
> are the rows of V.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

T : DOUBLE PRECISION array, dimension (LDT,MIN(M,N)) [out]
> The upper triangular block reflectors stored in compact form
> as a sequence of upper triangular blocks.  See below
> for further details.

LDT : INTEGER [in]
> The leading dimension of the array T.  LDT >= MB.

WORK : DOUBLE PRECISION array, dimension (MB\*N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
