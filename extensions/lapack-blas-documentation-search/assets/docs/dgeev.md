```fortran
subroutine dgeev (
        character jobvl,
        character jobvr,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( * ) wr,
        double precision, dimension( * ) wi,
        double precision, dimension( ldvl, * ) vl,
        integer ldvl,
        double precision, dimension( ldvr, * ) vr,
        integer ldvr,
        double precision, dimension( * ) work,
        integer lwork,
        integer info
)
```

DGEEV computes for an N-by-N real nonsymmetric matrix A, the
eigenvalues and, optionally, the left and/or right eigenvectors.

The right eigenvector v(j) of A satisfies
A \* v(j) = lambda(j) \* v(j)
where lambda(j) is its eigenvalue.
The left eigenvector u(j) of A satisfies
u(j)\*\*H \* A = lambda(j) \* u(j)\*\*H
where u(j)\*\*H denotes the conjugate-transpose of u(j).

The computed eigenvectors are normalized to have Euclidean norm
equal to 1 and largest component real.

## Parameters
JOBVL : CHARACTER\*1 [in]
> = 'N': left eigenvectors of A are not computed;
> = 'V': left eigenvectors of A are computed.

JOBVR : CHARACTER\*1 [in]
> = 'N': right eigenvectors of A are not computed;
> = 'V': right eigenvectors of A are computed.

N : INTEGER [in]
> The order of the matrix A. N >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> On entry, the N-by-N matrix A.
> On exit, A has been overwritten.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

WR : DOUBLE PRECISION array, dimension (N) [out]

WI : DOUBLE PRECISION array, dimension (N) [out]
> WR and WI contain the real and imaginary parts,
> respectively, of the computed eigenvalues.  Complex
> conjugate pairs of eigenvalues appear consecutively
> with the eigenvalue having the positive imaginary part
> first.

VL : DOUBLE PRECISION array, dimension (LDVL,N) [out]
> If JOBVL = 'V', the left eigenvectors u(j) are stored one
> after another in the columns of VL, in the same order
> as their eigenvalues.
> If JOBVL = 'N', VL is not referenced.
> If the j-th eigenvalue is real, then u(j) = VL(:,j),
> the j-th column of VL.
> If the j-th and (j+1)-st eigenvalues form a complex
> conjugate pair, then u(j) = VL(:,j) + i\*VL(:,j+1) and
> u(j+1) = VL(:,j) - i\*VL(:,j+1).

LDVL : INTEGER [in]
> The leading dimension of the array VL.  LDVL >= 1; if
> JOBVL = 'V', LDVL >= N.

VR : DOUBLE PRECISION array, dimension (LDVR,N) [out]
> If JOBVR = 'V', the right eigenvectors v(j) are stored one
> after another in the columns of VR, in the same order
> as their eigenvalues.
> If JOBVR = 'N', VR is not referenced.
> If the j-th eigenvalue is real, then v(j) = VR(:,j),
> the j-th column of VR.
> If the j-th and (j+1)-st eigenvalues form a complex
> conjugate pair, then v(j) = VR(:,j) + i\*VR(:,j+1) and
> v(j+1) = VR(:,j) - i\*VR(:,j+1).

LDVR : INTEGER [in]
> The leading dimension of the array VR.  LDVR >= 1; if
> JOBVR = 'V', LDVR >= N.

WORK : DOUBLE PRECISION array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.  LWORK >= max(1,3\*N), and
> if JOBVL = 'V' or JOBVR = 'V', LWORK >= 4\*N.  For good
> performance, LWORK must generally be larger.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  if INFO = i, the QR algorithm failed to compute all the
> eigenvalues, and no eigenvectors have been computed;
> elements i+1:N of WR and WI contain eigenvalues which
> have converged.
