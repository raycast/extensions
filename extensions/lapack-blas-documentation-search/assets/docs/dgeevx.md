```fortran
subroutine dgeevx (
        character balanc,
        character jobvl,
        character jobvr,
        character sense,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( * ) wr,
        double precision, dimension( * ) wi,
        double precision, dimension( ldvl, * ) vl,
        integer ldvl,
        double precision, dimension( ldvr, * ) vr,
        integer ldvr,
        integer ilo,
        integer ihi,
        double precision, dimension( * ) scale,
        double precision abnrm,
        double precision, dimension( * ) rconde,
        double precision, dimension( * ) rcondv,
        double precision, dimension( * ) work,
        integer lwork,
        integer, dimension( * ) iwork,
        integer info
)
```

DGEEVX computes for an N-by-N real nonsymmetric matrix A, the
eigenvalues and, optionally, the left and/or right eigenvectors.

Optionally also, it computes a balancing transformation to improve
the conditioning of the eigenvalues and eigenvectors (ILO, IHI,
SCALE, and ABNRM), reciprocal condition numbers for the eigenvalues
(RCONDE), and reciprocal condition numbers for the right
eigenvectors (RCONDV).

The right eigenvector v(j) of A satisfies
A \* v(j) = lambda(j) \* v(j)
where lambda(j) is its eigenvalue.
The left eigenvector u(j) of A satisfies
u(j)\*\*H \* A = lambda(j) \* u(j)\*\*H
where u(j)\*\*H denotes the conjugate-transpose of u(j).

The computed eigenvectors are normalized to have Euclidean norm
equal to 1 and largest component real.

Balancing a matrix means permuting the rows and columns to make it
more nearly upper triangular, and applying a diagonal similarity
transformation D \* A \* D\*\*(-1), where D is a diagonal matrix, to
make its rows and columns closer in norm and the condition numbers
of its eigenvalues and eigenvectors smaller.  The computed
reciprocal condition numbers correspond to the balanced matrix.
Permuting rows and columns will not change the condition numbers
(in exact arithmetic) but diagonal scaling will.  For further
explanation of balancing, see section 4.10.2 of the LAPACK
Users' Guide.

## Parameters
BALANC : CHARACTER\*1 [in]
> Indicates how the input matrix should be diagonally scaled
> and/or permuted to improve the conditioning of its
> eigenvalues.
> = 'N': Do not diagonally scale or permute;
> = 'P': Perform permutations to make the matrix more nearly
> upper triangular. Do not diagonally scale;
> = 'S': Diagonally scale the matrix, i.e. replace A by
> D\*A\*D\*\*(-1), where D is a diagonal matrix chosen
> to make the rows and columns of A more equal in
> norm. Do not permute;
> = 'B': Both diagonally scale and permute A.
> 
> Computed reciprocal condition numbers will be for the matrix
> after balancing and/or permuting. Permuting does not change
> condition numbers (in exact arithmetic), but balancing does.

JOBVL : CHARACTER\*1 [in]
> = 'N': left eigenvectors of A are not computed;
> = 'V': left eigenvectors of A are computed.
> If SENSE = 'E' or 'B', JOBVL must = 'V'.

JOBVR : CHARACTER\*1 [in]
> = 'N': right eigenvectors of A are not computed;
> = 'V': right eigenvectors of A are computed.
> If SENSE = 'E' or 'B', JOBVR must = 'V'.

SENSE : CHARACTER\*1 [in]
> Determines which reciprocal condition numbers are computed.
> = 'N': None are computed;
> = 'E': Computed for eigenvalues only;
> = 'V': Computed for right eigenvectors only;
> = 'B': Computed for eigenvalues and right eigenvectors.
> 
> If SENSE = 'E' or 'B', both left and right eigenvectors
> must also be computed (JOBVL = 'V' and JOBVR = 'V').

N : INTEGER [in]
> The order of the matrix A. N >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> On entry, the N-by-N matrix A.
> On exit, A has been overwritten.  If JOBVL = 'V' or
> JOBVR = 'V', A contains the real Schur form of the balanced
> version of the input matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

WR : DOUBLE PRECISION array, dimension (N) [out]

WI : DOUBLE PRECISION array, dimension (N) [out]
> WR and WI contain the real and imaginary parts,
> respectively, of the computed eigenvalues.  Complex
> conjugate pairs of eigenvalues will appear consecutively
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
> The leading dimension of the array VR.  LDVR >= 1, and if
> JOBVR = 'V', LDVR >= N.

ILO : INTEGER [out]

IHI : INTEGER [out]
> ILO and IHI are integer values determined when A was
> balanced.  The balanced A(i,j) = 0 if I > J and
> J = 1,...,ILO-1 or I = IHI+1,...,N.

SCALE : DOUBLE PRECISION array, dimension (N) [out]
> Details of the permutations and scaling factors applied
> when balancing A.  If P(j) is the index of the row and column
> interchanged with row and column j, and D(j) is the scaling
> factor applied to row and column j, then
> SCALE(J) = P(J),    for J = 1,...,ILO-1
> = D(J),    for J = ILO,...,IHI
> = P(J)     for J = IHI+1,...,N.
> The order in which the interchanges are made is N to IHI+1,
> then 1 to ILO-1.

ABNRM : DOUBLE PRECISION [out]
> The one-norm of the balanced matrix (the maximum
> of the sum of absolute values of elements of any column).

RCONDE : DOUBLE PRECISION array, dimension (N) [out]
> RCONDE(j) is the reciprocal condition number of the j-th
> eigenvalue.

RCONDV : DOUBLE PRECISION array, dimension (N) [out]
> RCONDV(j) is the reciprocal condition number of the j-th
> right eigenvector.

WORK : DOUBLE PRECISION array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.   If SENSE = 'N' or 'E',
> LWORK >= max(1,2\*N), and if JOBVL = 'V' or JOBVR = 'V',
> LWORK >= 3\*N.  If SENSE = 'V' or 'B', LWORK >= N\*(N+6).
> For good performance, LWORK must generally be larger.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

IWORK : INTEGER array, dimension (2\*N-2) [out]
> If SENSE = 'N' or 'E', not referenced.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  if INFO = i, the QR algorithm failed to compute all the
> eigenvalues, and no eigenvectors or condition numbers
> have been computed; elements 1:ILO-1 and i+1:N of WR
> and WI contain eigenvalues which have converged.
