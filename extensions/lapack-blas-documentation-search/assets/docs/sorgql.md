```fortran
subroutine sorgql (
        integer m,
        integer n,
        integer k,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( * ) tau,
        real, dimension( * ) work,
        integer lwork,
        integer info
)
```

SORGQL generates an M-by-N real matrix Q with orthonormal columns,
which is defined as the last N columns of a product of K elementary
reflectors of order M

Q  =  H(k) . . . H(2) H(1)

as returned by SGEQLF.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix Q. M >= 0.

N : INTEGER [in]
> The number of columns of the matrix Q. M >= N >= 0.

K : INTEGER [in]
> The number of elementary reflectors whose product defines the
> matrix Q. N >= K >= 0.

A : REAL array, dimension (LDA,N) [in,out]
> On entry, the (n-k+i)-th column must contain the vector which
> defines the elementary reflector H(i), for i = 1,2,...,k, as
> returned by SGEQLF in the last k columns of its array
> argument A.
> On exit, the M-by-N matrix Q.

LDA : INTEGER [in]
> The first dimension of the array A. LDA >= max(1,M).

TAU : REAL array, dimension (K) [in]
> TAU(i) must contain the scalar factor of the elementary
> reflector H(i), as returned by SGEQLF.

WORK : REAL array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK. LWORK >= max(1,N).
> For optimum performance LWORK >= N\*NB, where NB is the
> optimal blocksize.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument has an illegal value
