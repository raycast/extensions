```fortran
subroutine chpgvd (
        integer itype,
        character jobz,
        character uplo,
        integer n,
        complex, dimension( * ) ap,
        complex, dimension( * ) bp,
        real, dimension( * ) w,
        complex, dimension( ldz, * ) z,
        integer ldz,
        complex, dimension( * ) work,
        integer lwork,
        real, dimension( * ) rwork,
        integer lrwork,
        integer, dimension( * ) iwork,
        integer liwork,
        integer info
)
```

CHPGVD computes all the eigenvalues and, optionally, the eigenvectors
of a complex generalized Hermitian-definite eigenproblem, of the form
A\*x=(lambda)\*B\*x,  A\*Bx=(lambda)\*x,  or B\*A\*x=(lambda)\*x.  Here A and
B are assumed to be Hermitian, stored in packed format, and B is also
positive definite.
If eigenvectors are desired, it uses a divide and conquer algorithm.

## Parameters
ITYPE : INTEGER [in]
> Specifies the problem type to be solved:
> = 1:  A\*x = (lambda)\*B\*x
> = 2:  A\*B\*x = (lambda)\*x
> = 3:  B\*A\*x = (lambda)\*x

JOBZ : CHARACTER\*1 [in]
> = 'N':  Compute eigenvalues only;
> = 'V':  Compute eigenvalues and eigenvectors.

UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangles of A and B are stored;
> = 'L':  Lower triangles of A and B are stored.

N : INTEGER [in]
> The order of the matrices A and B.  N >= 0.

AP : COMPLEX array, dimension (N\*(N+1)/2) [in,out]
> On entry, the upper or lower triangle of the Hermitian matrix
> A, packed columnwise in a linear array.  The j-th column of A
> is stored in the array AP as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = A(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*(2\*n-j)/2) = A(i,j) for j<=i<=n.
> 
> On exit, the contents of AP are destroyed.

BP : COMPLEX array, dimension (N\*(N+1)/2) [in,out]
> On entry, the upper or lower triangle of the Hermitian matrix
> B, packed columnwise in a linear array.  The j-th column of B
> is stored in the array BP as follows:
> if UPLO = 'U', BP(i + (j-1)\*j/2) = B(i,j) for 1<=i<=j;
> if UPLO = 'L', BP(i + (j-1)\*(2\*n-j)/2) = B(i,j) for j<=i<=n.
> 
> On exit, the triangular factor U or L from the Cholesky
> factorization B = U\*\*H\*U or B = L\*L\*\*H, in the same storage
> format as B.

W : REAL array, dimension (N) [out]
> If INFO = 0, the eigenvalues in ascending order.

Z : COMPLEX array, dimension (LDZ, N) [out]
> If JOBZ = 'V', then if INFO = 0, Z contains the matrix Z of
> eigenvectors.  The eigenvectors are normalized as follows:
> if ITYPE = 1 or 2, Z\*\*H\*B\*Z = I;
> if ITYPE = 3, Z\*\*H\*inv(B)\*Z = I.
> If JOBZ = 'N', then Z is not referenced.

LDZ : INTEGER [in]
> The leading dimension of the array Z.  LDZ >= 1, and if
> JOBZ = 'V', LDZ >= max(1,N).

WORK : COMPLEX array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the required LWORK.

LWORK : INTEGER [in]
> The dimension of array WORK.
> If N <= 1,               LWORK >= 1.
> If JOBZ = 'N' and N > 1, LWORK >= N.
> If JOBZ = 'V' and N > 1, LWORK >= 2\*N.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the required sizes of the WORK, RWORK and
> IWORK arrays, returns these values as the first entries of
> the WORK, RWORK and IWORK arrays, and no error message
> related to LWORK or LRWORK or LIWORK is issued by XERBLA.

RWORK : REAL array, dimension (MAX(1,LRWORK)) [out]
> On exit, if INFO = 0, RWORK(1) returns the required LRWORK.

LRWORK : INTEGER [in]
> The dimension of array RWORK.
> If N <= 1,               LRWORK >= 1.
> If JOBZ = 'N' and N > 1, LRWORK >= N.
> If JOBZ = 'V' and N > 1, LRWORK >= 1 + 5\*N + 2\*N\*\*2.
> 
> If LRWORK = -1, then a workspace query is assumed; the
> routine only calculates the required sizes of the WORK, RWORK
> and IWORK arrays, returns these values as the first entries
> of the WORK, RWORK and IWORK arrays, and no error message
> related to LWORK or LRWORK or LIWORK is issued by XERBLA.

IWORK : INTEGER array, dimension (MAX(1,LIWORK)) [out]
> On exit, if INFO = 0, IWORK(1) returns the required LIWORK.

LIWORK : INTEGER [in]
> The dimension of array IWORK.
> If JOBZ  = 'N' or N <= 1, LIWORK >= 1.
> If JOBZ  = 'V' and N > 1, LIWORK >= 3 + 5\*N.
> 
> If LIWORK = -1, then a workspace query is assumed; the
> routine only calculates the required sizes of the WORK, RWORK
> and IWORK arrays, returns these values as the first entries
> of the WORK, RWORK and IWORK arrays, and no error message
> related to LWORK or LRWORK or LIWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  CPPTRF or CHPEVD returned an error code:
> <= N:  if INFO = i, CHPEVD failed to converge;
> i off-diagonal elements of an intermediate
> tridiagonal form did not convergeto zero;
> > N:   if INFO = N + i, for 1 <= i <= n, then the leading
> principal minor of order i of B is not positive.
> The factorization of B could not be completed and
> no eigenvalues or eigenvectors were computed.
