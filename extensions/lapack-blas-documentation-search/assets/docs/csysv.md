```fortran
subroutine csysv (
        character uplo,
        integer n,
        integer nrhs,
        complex, dimension( lda, * ) a,
        integer lda,
        integer, dimension( * ) ipiv,
        complex, dimension( ldb, * ) b,
        integer ldb,
        complex, dimension( * ) work,
        integer lwork,
        integer info
)
```

CSYSV computes the solution to a complex system of linear equations
A \* X = B,
where A is an N-by-N symmetric matrix and X and B are N-by-NRHS
matrices.

The diagonal pivoting method is used to factor A as
A = U \* D \* U\*\*T,  if UPLO = 'U', or
A = L \* D \* L\*\*T,  if UPLO = 'L',
where U (or L) is a product of permutation and unit upper (lower)
triangular matrices, and D is symmetric and block diagonal with
1-by-1 and 2-by-2 diagonal blocks.  The factored form of A is then
used to solve the system of equations A \* X = B.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

A : COMPLEX array, dimension (LDA,N) [in,out]
> On entry, the symmetric matrix A.  If UPLO = 'U', the leading
> N-by-N upper triangular part of A contains the upper
> triangular part of the matrix A, and the strictly lower
> triangular part of A is not referenced.  If UPLO = 'L', the
> leading N-by-N lower triangular part of A contains the lower
> triangular part of the matrix A, and the strictly upper
> triangular part of A is not referenced.
> 
> On exit, if INFO = 0, the block diagonal matrix D and the
> multipliers used to obtain the factor U or L from the
> factorization A = U\*D\*U\*\*T or A = L\*D\*L\*\*T as computed by
> CSYTRF.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

IPIV : INTEGER array, dimension (N) [out]
> Details of the interchanges and the block structure of D, as
> determined by CSYTRF.  If IPIV(k) > 0, then rows and columns
> k and IPIV(k) were interchanged, and D(k,k) is a 1-by-1
> diagonal block.  If UPLO = 'U' and IPIV(k) = IPIV(k-1) < 0,
> then rows and columns k-1 and -IPIV(k) were interchanged and
> D(k-1:k,k-1:k) is a 2-by-2 diagonal block.  If UPLO = 'L' and
> IPIV(k) = IPIV(k+1) < 0, then rows and columns k+1 and
> -IPIV(k) were interchanged and D(k:k+1,k:k+1) is a 2-by-2
> diagonal block.

B : COMPLEX array, dimension (LDB,NRHS) [in,out]
> On entry, the N-by-NRHS right hand side matrix B.
> On exit, if INFO = 0, the N-by-NRHS solution matrix X.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

WORK : COMPLEX array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The length of WORK.  LWORK >= 1, and for best performance
> LWORK >= max(1,N\*NB), where NB is the optimal blocksize for
> CSYTRF.
> for LWORK < N, TRS will be done with Level BLAS 2
> for LWORK >= N, TRS will be done with Level BLAS 3
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
> > 0: if INFO = i, D(i,i) is exactly zero.  The factorization
> has been completed, but the block diagonal matrix D is
> exactly singular, so the solution could not be computed.
