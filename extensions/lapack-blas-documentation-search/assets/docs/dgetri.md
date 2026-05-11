```fortran
subroutine dgetri (
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        integer, dimension( * ) ipiv,
        double precision, dimension( * ) work,
        integer lwork,
        integer info
)
```

DGETRI computes the inverse of a matrix using the LU factorization
computed by DGETRF.

This method inverts U and then computes inv(A) by solving the system
inv(A)\*L = inv(U) for inv(A).

## Parameters
N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> On entry, the factors L and U from the factorization
> A = P\*L\*U as computed by DGETRF.
> On exit, if INFO = 0, the inverse of the original matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

IPIV : INTEGER array, dimension (N) [in]
> The pivot indices from DGETRF; for 1<=i<=N, row i of the
> matrix was interchanged with row IPIV(i).

WORK : DOUBLE PRECISION array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO=0, then WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.  LWORK >= max(1,N).
> For optimal performance LWORK >= N\*NB, where NB is
> the optimal blocksize returned by ILAENV.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, U(i,i) is exactly zero; the matrix is
> singular and its inverse could not be computed.
